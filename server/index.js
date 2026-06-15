/**
 * Gaokao Math Shop - Backend Server
 * Serves static files + handles payment processing
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3000;

// Stripe (optional - only if configured)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// ========================================
// Middleware
// ========================================

app.use(cors());
app.use(express.json());

// Serve static website files
app.use(express.static(path.join(__dirname, '..', 'website')));

// ========================================
// Products Data
// ========================================

function loadProducts() {
  try {
    const metaPath = path.join(__dirname, '..', 'website', 'products', 'products.json');
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Could not load products.json, using defaults');
  }
  return null;
}

function getDefaultProducts() {
  return {
    'trigonometry-basics': {
      name: '三角函数·基础必刷题',
      slug: 'trigonometry-basics',
      description: '高考三角函数基础题型全覆盖，含30道经典题+详细解析',
      topic: '三角函数',
      difficulty: '基础',
      price_cny: 19.9,
      price_usd: 2.99,
    },
    'derivative-advanced': {
      name: '导数·压轴题突破',
      slug: 'derivative-advanced',
      description: '导数压轴题专项训练，含20道真题改编+详细解析',
      topic: '导数与函数',
      difficulty: '压轴',
      price_cny: 29.9,
      price_usd: 4.99,
    },
    'mock-exam-1': {
      name: '高考数学·全真模拟卷（一）',
      slug: 'mock-exam-1',
      description: '严格按照高考数学新I卷标准命题，含完整解析',
      topic: '综合模拟',
      difficulty: '综合',
      price_cny: 15.9,
      price_usd: 2.49,
    },
  };
}

// ========================================
// API Routes
// ========================================

// GET /products - list all products
app.get('/products', (req, res) => {
  const products = loadProducts() || getDefaultProducts();
  res.json(Object.values(products));
});

// GET /products/:slug - get single product
app.get('/products/:slug', (req, res) => {
  const products = loadProducts() || getDefaultProducts();
  const product = products[req.params.slug];
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
});

// POST /api/create-checkout - Stripe checkout session
app.post('/api/create-checkout', async (req, res) => {
  const { product: slug } = req.body;

  const products = loadProducts() || getDefaultProducts();
  const product = products[slug];

  if (!product) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  // Check if PDF exists
  const pdfPath = path.join(__dirname, '..', 'website', 'products', 'assets', `${slug}.pdf`);
  if (!fs.existsSync(pdfPath)) {
    return res.status(404).json({ error: 'Product file not generated yet. Run the content engine first.' });
  }

  if (stripe) {
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card', 'alipay'],
        line_items: [{
          price_data: {
            currency: 'cny',
            product_data: {
              name: product.name,
              description: product.description,
            },
            unit_amount: Math.round(product.price_cny * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.BASE_URL || `http://localhost:${PORT}`}/success.html?product=${slug}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL || `http://localhost:${PORT}`}/checkout.html?product=${slug}`,
        metadata: { product_slug: slug },
      });

      res.json({ url: session.url });
    } catch (err) {
      console.error('Stripe error:', err);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  } else {
    // No Stripe configured - direct download mode
    const orderId = uuidv4().slice(0, 8);
    res.json({
      url: `/success.html?product=${slug}&order_id=${orderId}`,
      direct_download: true,
    });
  }
});

// POST /api/create-order - Simple order record (no Stripe fallback)
app.post('/api/create-order', (req, res) => {
  const { product: slug } = req.body;
  const products = loadProducts() || getDefaultProducts();
  const product = products[slug];

  if (!product) {
    return res.status(400).json({ error: 'Invalid product' });
  }

  const orderId = uuidv4().slice(0, 8).toUpperCase();
  res.json({
    order_id: orderId,
    product: product.name,
    download_url: `/products/assets/${slug}.pdf`,
  });
});

// ========================================
// Download token protection (optional)
// ========================================

// Simple token-based download protection
const downloadTokens = new Map();

app.post('/api/request-download', (req, res) => {
  const { product: slug } = req.body;
  const token = uuidv4();
  downloadTokens.set(token, { slug, expires: Date.now() + 24 * 60 * 60 * 1000 }); // 24h
  res.json({ token, url: `/api/download/${token}/${slug}.pdf` });
});

app.get('/api/download/:token/:filename', (req, res) => {
  const { token, filename } = req.params;
  const record = downloadTokens.get(token);

  if (!record || record.expires < Date.now()) {
    downloadTokens.delete(token);
    return res.status(403).json({ error: 'Download link expired or invalid' });
  }

  const filePath = path.join(__dirname, '..', 'website', 'products', 'assets', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  downloadTokens.delete(token); // One-time use
  res.download(filePath);
});

// ========================================
// Stripe Webhook (optional)
// ========================================

if (stripe && process.env.STRIPE_WEBHOOK_SECRET) {
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const slug = session.metadata?.product_slug;
      console.log(`✅ Payment received for: ${slug}, session: ${session.id}`);

      // Generate download token and could email it here
      if (slug) {
        const token = uuidv4();
        downloadTokens.set(token, { slug, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 }); // 7 days
        console.log(`   Download token: ${token}`);
        // TODO: Send email with download link if customer_email is available
      }
    }

    res.json({ received: true });
  });
}

// ========================================
// Start Server
// ========================================

app.listen(PORT, () => {
  console.log(`\n  🚀 高考数学备考资料商店`);
  console.log(`  ─────────────────────────`);
  console.log(`  🌐 站点: http://localhost:${PORT}`);
  console.log(`  📊 产品API: http://localhost:${PORT}/products`);
  if (stripe) {
    console.log(`  💳 支付: Stripe (已配置)`);
  } else {
    console.log(`  💳 支付: 直接下载模式 (未配置Stripe)`);
  }
  console.log(`\n  按 Ctrl+C 停止服务\n`);
});
