/**
 * Gaokao Math Shop - Zero-dependency HTTP Server
 * Uses only Node.js built-in modules.
 * No npm install needed.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3000;
const WEB_ROOT = path.join(__dirname, '..', 'website');

// MIME types
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// ========================================
// Products
// ========================================

const DEFAULT_PRODUCTS = [
  {
    name: '三角函数·基础必刷题',
    slug: 'trigonometry-basics',
    description: '高考三角函数基础题型全覆盖，含30道经典题+详细解析',
    topic: '三角函数',
    difficulty: '基础',
    price_cny: 19.9,
    price_usd: 2.99,
  },
  {
    name: '导数·压轴题突破',
    slug: 'derivative-advanced',
    description: '导数压轴题专项训练，含20道真题改编+详细解析',
    topic: '导数与函数',
    difficulty: '压轴',
    price_cny: 29.9,
    price_usd: 4.99,
  },
  {
    name: '高考数学·全真模拟卷（一）',
    slug: 'mock-exam-1',
    description: '严格按照高考数学新I卷标准命题，含完整解析',
    topic: '综合模拟',
    difficulty: '综合',
    price_cny: 15.9,
    price_usd: 2.49,
  },
];

function loadProducts() {
  try {
    const p = path.join(WEB_ROOT, 'products', 'products.json');
    if (fs.existsSync(p)) {
      const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
      return Object.values(data);
    }
  } catch (e) {}
  return DEFAULT_PRODUCTS;
}

// ========================================
// Download tokens
// ========================================

const tokens = new Map();
const TOKEN_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Cleanup expired tokens every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokens) {
    if (val.expires < now) tokens.delete(key);
  }
}, 60 * 60 * 1000);

// ========================================
// Request Router
// ========================================

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendError(res, msg, status = 400) {
  sendJSON(res, { error: msg }, status);
}

function router(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  // --- API: GET /products ---
  if (method === 'GET' && pathname === '/products') {
    return sendJSON(res, loadProducts());
  }

  // --- API: GET /products/:slug ---
  const productMatch = pathname.match(/^\/products\/([a-zA-Z0-9_-]+)$/);
  if (method === 'GET' && productMatch) {
    const slug = productMatch[1];
    const products = loadProducts();
    const product = products.find(p => p.slug === slug);
    if (!product) return sendError(res, 'Product not found', 404);
    return sendJSON(res, product);
  }

  // --- API: POST /api/create-checkout ---
  if (method === 'POST' && pathname === '/api/create-checkout') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { product: slug } = JSON.parse(body);
        const products = loadProducts();
        const product = products.find(p => p.slug === slug);
        if (!product) return sendError(res, 'Invalid product');

        // Check if PDF exists
        const pdfPath = path.join(WEB_ROOT, 'products', 'assets', `${slug}.pdf`);
        const pdfExists = fs.existsSync(pdfPath);

        if (pdfExists) {
          // Generate download token for protected delivery
          const token = crypto.randomBytes(16).toString('hex');
          tokens.set(token, { slug, expires: Date.now() + TOKEN_TTL });

          return sendJSON(res, {
            url: `/success.html?product=${slug}&token=${token}`,
            order_id: crypto.randomBytes(4).toString('hex').toUpperCase(),
          });
        } else {
          // No PDF yet - redirect anyway (for testing)
          return sendJSON(res, {
            url: `/success.html?product=${slug}`,
            note: 'Direct download mode - generate content first for real PDFs',
          });
        }
      } catch (e) {
        return sendError(res, 'Invalid request body');
      }
    });
    return;
  }

  // --- API: GET /api/download/:token/:filename ---
  const downloadMatch = pathname.match(/^\/api\/download\/([a-f0-9]+)\/(.+)$/);
  if (method === 'GET' && downloadMatch) {
    const token = downloadMatch[1];
    const filename = downloadMatch[2];
    const record = tokens.get(token);

    if (!record || record.expires < Date.now()) {
      tokens.delete(token);
      res.writeHead(403, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h2>下载链接已过期或无效</h2><p>请重新购买获取新的下载链接。</p><a href="/">返回主页</a>');
    }

    const filePath = path.join(WEB_ROOT, 'products', 'assets', filename);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end('<h2>文件未找到</h2><p>请确认资料已生成。</p>');
    }

    tokens.delete(token); // One-time use
    const ext = path.extname(filename);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    });
    return fs.createReadStream(filePath).pipe(res);
  }

  // --- Static file serving ---
  let filePath = path.join(WEB_ROOT, pathname === '/' ? 'index.html' : pathname);

  // SPA route: if no extension, try .html
  if (!path.extname(filePath)) {
    const htmlPath = filePath + '.html';
    if (fs.existsSync(htmlPath)) {
      filePath = htmlPath;
    }
  }

  const ext = path.extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<h2>404 - 页面未找到</h2><a href="/">返回主页</a>');
      } else {
        res.writeHead(500);
        res.end('Server error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
}

// ========================================
// Start
// ========================================

const server = http.createServer(router);

server.listen(PORT, () => {
  const addr = `http://localhost:${PORT}`;
  console.log('\n  🚀  高考数学备考资料商店');
  console.log('  ─────────────────────────');
  console.log(`  🌐  站点: ${addr}`);
  console.log(`  📊  API:  ${addr}/products`);
  console.log(`  💡  Ctrl+C 停止服务\n`);
});
