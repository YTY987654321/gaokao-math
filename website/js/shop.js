/**
 * Gaokao Math Shop - Product management and checkout
 */

const API_BASE = window.LOCAL_MODE ? '' : '';

let products = [];
let cart = [];

// ========================================
// Product Loading
// ========================================

async function loadProducts() {
  try {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error('Failed to load products');
    products = await res.json();
    return products;
  } catch (e) {
    console.warn('API not available, loading local products...');
    return loadLocalProducts();
  }
}

async function loadLocalProducts() {
  try {
    const res = await fetch('products/products.json');
    if (!res.ok) throw new Error('No local products');
    const data = await res.json();
    return Object.values(data);
  } catch (e) {
    // Fallback: hardcoded products
    return [
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
  }
}

// ========================================
// Product Card Rendering
// ========================================

function getBadgeClass(difficulty) {
  const map = { '基础': 'badge-basic', '中等': 'badge-basic', '压轴': 'badge-advanced', '综合': 'badge-comprehensive' };
  return map[difficulty] || 'badge-basic';
}

function renderProductCard(product) {
  const div = document.createElement('div');
  div.className = 'product-card';
  div.innerHTML = `
    <span class="product-badge ${getBadgeClass(product.difficulty)}">${product.difficulty}</span>
    <div class="product-topic">${product.topic}</div>
    <div class="product-title">${product.name}</div>
    <div class="product-desc">${product.description}</div>
    <div class="product-footer">
      <div class="product-price">
        <span class="price-cny">¥${product.price_cny}</span>
        <span class="price-usd">≈ $${product.price_usd}</span>
      </div>
      <button class="btn-buy" onclick="buyNow('${product.slug}')">
        🛒 立即购买
      </button>
    </div>
  `;
  return div;
}

async function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  grid.innerHTML = '<div class="loading">加载产品中...</div>';
  const items = await loadProducts();
  grid.innerHTML = '';
  items.forEach(p => grid.appendChild(renderProductCard(p)));
}

// ========================================
// Checkout Flow
// ========================================

function buyNow(slug) {
  // Go to checkout page
  window.location.href = `/checkout.html?product=${slug}`;
}

async function initCheckout() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('product');

  if (!slug) {
    document.getElementById('checkout-content').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);padding:60px 0;">未选择产品，请返回主页选择。</p>';
    return;
  }

  const items = await loadProducts();
  const product = items.find(p => p.slug === slug);

  if (!product) {
    document.getElementById('checkout-content').innerHTML =
      '<p style="text-align:center;color:var(--text-muted);padding:60px 0;">产品不存在。</p>';
    return;
  }

  document.getElementById('checkout-content').innerHTML = `
    <div class="checkout-product">
      <h3>${product.name}</h3>
      <p class="checkout-desc">${product.description}</p>
      <p class="checkout-price">¥${product.price_cny}</p>
    </div>
    <form id="payment-form" class="payment-form">
      <input type="hidden" name="product" value="${product.slug}">
      <button type="submit" class="btn-pay">支付 ¥${product.price_cny}</button>
      <p class="payment-note">支付成功后，你将立即获得下载链接。</p>
    </form>
  `;

  document.getElementById('payment-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await processPayment(product.slug);
  });
}

async function processPayment(slug) {
  const btn = document.querySelector('.btn-pay');
  btn.disabled = true;
  btn.textContent = '处理中...';

  try {
    // Try server payment checkout
    const res = await fetch(`${API_BASE}/api/create-checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product: slug }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    }
  } catch (e) {
    console.log('Server checkout unavailable, using direct download');
  }

  // Fallback: direct download (for development/testing)
  btn.textContent = '✅ 下载中...';
  window.location.href = `/products/assets/${slug}.pdf`;
  btn.textContent = '✅ 下载已开始';
}

// ========================================
// Toast Notifications
// ========================================

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${message}</span>`;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 4000);
}

// ========================================
// Success Page
// ========================================

async function initSuccess() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('product');
  const orderId = params.get('order_id');

  if (slug) {
    document.getElementById('success-download').href = `/products/assets/${slug}.pdf`;
    document.getElementById('success-download').style.display = 'inline-block';
    document.getElementById('order-id').textContent = orderId || 'N/A';
  }
}

// ========================================
// Initialize
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  renderProducts();
  initCheckout();
  initSuccess();

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      q.parentElement.classList.toggle('active');
    });
  });
});
