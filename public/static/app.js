// Global State
let currentUser = null;
let cart = [];

// API Base URL
const API_BASE = '/api';

// Helper Functions
const API = {
  async request(url, options = {}) {
    try {
      const response = await axios({
        url: `${API_BASE}${url}`,
        ...options
      });
      return response.data;
    } catch (error) {
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw new Error('حدث خطأ في الاتصال بالخادم');
    }
  }
};

// Format currency (OMR)
const formatCurrency = (amount) => `${parseFloat(amount).toFixed(3)} ر.ع`;

// Format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-OM', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

// Show notification
const showNotification = (message, type = 'success') => {
  const bg = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const el = document.createElement('div');
  el.className = `fixed top-4 left-1/2 -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-lg shadow-lg z-50`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
};

// Auth helpers
const checkAuth = () => {
  const userData = localStorage.getItem('user');
  if (userData) { currentUser = JSON.parse(userData); return true; }
  return false;
};
const logout = () => {
  localStorage.removeItem('user');
  currentUser = null; cart = [];
  renderLoginPage();
};

// ================= Login Page =================
const renderLoginPage = () => {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="bg-gradient-to-r from-green-600 to-green-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-seedling text-white text-3xl"></i>
          </div>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">مزرعة الخضروات</h1>
          <p class="text-gray-600">نظام إدارة المبيعات</p>
        </div>
        <form id="loginForm" class="space-y-6">
          <div>
            <label class="block text-gray-700 font-semibold mb-2">
              <i class="fas fa-user ml-2"></i>
              اسم المستخدم
            </label>
            <input type="text" id="username" required autocomplete="username"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="أدخل اسم المستخدم" />
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2">
              <i class="fas fa-lock ml-2"></i>
              كلمة المرور
            </label>
            <input type="password" id="password" required autocomplete="current-password"
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="أدخل كلمة المرور" />
          </div>
          <button type="submit"
            class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg focus:outline-none focus:ring-2 focus:ring-green-200">
            <i class="fas fa-sign-in-alt ml-2"></i>
            تسجيل الدخول
          </button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
};

const handleLogin = async (e) => {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  try {
    const data = await API.request('/auth/login', { method: 'POST', data: { username, password } });
    currentUser = data.user;
    localStorage.setItem('user', JSON.stringify(currentUser));
    showNotification('تم تسجيل الدخول بنجاح');
    if (currentUser.role === 'admin') renderAdminDashboard(); else renderShopDashboard();
  } catch (err) { showNotification(err.message, 'error'); }
};

// ================= Admin Dashboard =================
const renderAdminDashboard = async () => {
  try {
    const qs = (window.dashFrom && window.dashTo) ? `?from=${window.dashFrom}&to=${window.dashTo}` : '';
    const stats = await API.request(`/stats/dashboard${qs}`);

    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        <header class="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
          <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="bg-white/20 p-3 rounded-full"><i class="fas fa-seedling text-2xl"></i></div>
                <div>
                  <h1 class="text-2xl font-bold">لوحة تحكم المزرعة</h1>
                  <p class="text-green-100 text-sm">${currentUser.name}</p>
                </div>
              </div>
              <button onclick="logout()" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-white/70">
                <i class="fas fa-sign-out-alt ml-2"></i> خروج
              </button>
            </div>
          </div>
        </header>

        <div class="bg-white shadow-md">
          <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex gap-2 overflow-x-auto">
              <button onclick="showAdminTab('overview')" class="admin-tab px-4 sm:px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-green-600 text-green-700" data-tab="overview">
                <i class="fas fa-home ml-2"></i>نظرة عامة
              </button>
              <button onclick="showAdminTab('orders')" class="admin-tab px-4 sm:px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700 relative" data-tab="orders">
                <i class="fas fa-shopping-cart ml-2"></i>الحجوزات
                <span id="ordersPendingBadge" class="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[25%] pointer-events-none bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style="${stats.pendingOrders > 0 ? '' : 'display:none'}">${stats.pendingOrders || 0}</span>
              </button>
              <button onclick="showAdminTab('products')" class="admin-tab px-4 sm:px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="products">
                <i class="fas fa-leaf ml-2"></i>المنتجات
              </button>
              <button onclick="showAdminTab('shops')" class="admin-tab px-4 sm:px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="shops">
                <i class="fas fa-store ml-2"></i>المحلات
              </button>
              <button onclick="showAdminTab('reports')" class="admin-tab px-4 sm:px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="reports">
                <i class="fas fa-chart-bar ml-2"></i>التقارير
              </button>
              <button onclick="showAdminTab('settings')" class="admin-tab px-4 sm:px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="settings">
                <i class="fas fa-cog ml-2"></i>الإعدادات
              </button>
            </div>
          </div>
        </div>

        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div id="admin-content">
            <div class="bg-white rounded-xl shadow p-4 mb-6">
              <div class="flex flex-row flex-wrap gap-2 items-end">
                <div class="flex-1">
                  <label class="block text-gray-700 text-sm font-semibold mb-1">من تاريخ</label>
                  <input type="date" id="dashFrom" value="${window.dashFrom || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div class="flex-1">
                  <label class="block text-gray-700 text-sm font-semibold mb-1">إلى تاريخ</label>
                  <input type="date" id="dashTo" value="${window.dashTo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <button onclick="applyDashboardFilter()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold">تطبيق</button>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div class="bg-white rounded-xl shadow-lg p-6 border-r-4 border-green-600">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-gray-600 text-sm">إجمالي المنتجات</p>
                    <h3 class="text-3xl font-bold text-gray-800 mt-1">${stats.products}</h3>
                  </div>
                  <div class="bg-green-100 p-4 rounded-full">
                    <i class="fas fa-leaf text-green-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              <div class="bg-white rounded-xl shadow-lg p-6 border-r-4 border-blue-600">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-gray-600 text-sm">عدد المحلات</p>
                    <h3 class="text-3xl font-bold text-gray-800 mt-1">${stats.shops}</h3>
                  </div>
                  <div class="bg-blue-100 p-4 rounded-full">
                    <i class="fas fa-store text-blue-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              <div class="bg-white rounded-xl shadow-lg p-6 border-r-4 border-yellow-600">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-gray-600 text-sm">الحجوزات المعلقة</p>
                    <h3 class="text-3xl font-bold text-gray-800 mt-1">${stats.pendingOrders}</h3>
                  </div>
                  <div class="bg-yellow-100 p-4 rounded-full">
                    <i class="fas fa-clock text-yellow-600 text-2xl"></i>
                  </div>
                </div>
              </div>
              <div class="bg-white rounded-xl shadow-lg p-6 border-r-4 border-purple-600">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-gray-600 text-sm">إجمالي المبيعات</p>
                    <h3 class="text-2xl font-bold text-gray-800 mt-1">${formatCurrency(stats.totalSales)}</h3>
                  </div>
                  <div class="bg-purple-100 p-4 rounded-full">
                    <i class="fas fa-money-bill-wave text-purple-600 text-2xl"></i>
                  </div>
                </div>
              </div>
            </div>

            ${stats.lowStock.length > 0 ? `
              <div class="bg-red-50 border-r-4 border-red-600 rounded-xl shadow-lg p-6 mb-8">
                <h3 class="text-xl font-bold text-red-800 mb-4">
                  <i class="fas fa-exclamation-triangle ml-2"></i>
                  تنبيه: منتجات قاربت على النفاد
                </h3>
                <div class="space-y-2">
                  ${stats.lowStock.map(p => `
                    <div class="flex justify-between items-center bg-white p-3 rounded-lg">
                      <span class="font-semibold">${p.name_ar}</span>
                      <span class="text-red-600 font-bold">${p.quantity} ${p.unit}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}

            <div class="bg-white rounded-xl shadow-lg p-6">
              <h3 class="text-xl font-bold text-gray-800 mb-4">
                <i class="fas fa-shopping-cart ml-2"></i>
                آخر الحجوزات
              </h3>
              <div id="recent-orders"></div>
            </div>
          </div>
        </div>
      </div>
    `;
    loadRecentOrders();
  } catch (error) {
    showNotification('حدث خطأ في تحميل لوحة التحكم', 'error');
  }
};

const loadRecentOrders = async () => {
  try {
    const orders = await API.request('/orders?role=admin');
    const recentOrders = orders.slice(0, 5);
    const container = document.getElementById('recent-orders');
    if (recentOrders.length === 0) {
      container.innerHTML = '<p class="text-gray-500 text-center py-4">لا توجد حجوزات بعد</p>';
      return;
    }
    container.innerHTML = `
      <div class="hidden md:block w-full overflow-x-auto">
        <table class="min-w-full table-fixed">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">رقم الحجز</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">المحل</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">المبلغ</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">التاريخ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${recentOrders.map(order => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">#${order.id}</td>
                <td class="px-4 py-3 text-sm font-semibold">${order.shop_name}</td>
                <td class="px-4 py-3 text-sm">${formatCurrency(order.total_amount)}</td>
                <td class="px-4 py-3">
                  <span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}">
                    ${getStatusText(order.status)}
                  </span>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${formatDate(order.created_at)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="md:hidden space-y-3">
        ${recentOrders.map(order => `
          <div class="border border-gray-200 rounded-xl p-4">
            <div class="flex justify-between items-center mb-2">
              <h4 class="font-bold">حجز #${order.id}</h4>
              <span class="px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}">${getStatusText(order.status)}</span>
            </div>
            <p class="text-sm text-gray-700 font-semibold mb-1">${order.shop_name}</p>
            <div class="flex justify-between text-sm">
              <span class="text-gray-600">${formatDate(order.created_at)}</span>
              <span class="font-bold text-green-600">${formatCurrency(order.total_amount)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (error) { console.error('Error loading orders:', error); }
};

const showAdminTab = (tab) => {
  document.querySelectorAll('.admin-tab').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('border-green-600', 'text-green-700');
      btn.classList.remove('border-transparent', 'text-gray-600');
    } else {
      btn.classList.remove('border-green-600', 'text-green-700');
      btn.classList.add('border-transparent', 'text-gray-600');
    }
  });
  switch (tab) {
    case 'overview': renderAdminDashboard(); break;
    case 'products': renderProductsManagement(); break;
    case 'shops': renderShopsManagement(); break;
    case 'orders': renderOrdersManagement(); break;
    case 'reports': renderSalesReports(); break;
    case 'settings': if (currentUser && currentUser.role === 'admin') { renderSettings(); } else { showNotification('صلاحيات غير كافية', 'error'); } break;
  }
};

// ================= Products Management =================
const renderProductsManagement = async () => {
  try {
    const products = await API.request('/products');
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="bg-white rounded-xl shadow-lg p-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h2 class="text-2xl font-bold text-gray-800"><i class="fas fa-leaf ml-2"></i>إدارة المنتجات</h2>
          <button onclick="showAddProductModal()" class="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg">إضافة منتج جديد</button>
        </div>
        <div id="products-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          ${products.map(product => `
            <div class="border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all">
              ${product.image_url ? `<div class="w-full h-40 bg-gray-100 rounded-md mb-4 overflow-hidden"><img src="${product.image_url}" alt="${product.name_ar}" class="w-full h-40 object-cover"></div>` : ``}
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-bold text-gray-800">${product.name_ar}</h3>
                  <p class="text-gray-600 text-sm">${product.name_en || ''}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${product.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">${product.status === 'available' ? 'متوفر' : 'غير متوفر'}</span>
              </div>
              ${product.description ? `<p class="text-gray-600 text-sm mb-4">${product.description}</p>` : ''}
              <div class="space-y-2 mb-4">
                <div class="flex justify-between items-center"><span class="text-gray-600">السعر:</span><span class="text-xl font-bold text-green-600">${formatCurrency(product.price)}</span></div>
                <div class="flex justify-between items-center"><span class="text-gray-600">الكمية:</span><span class="font-bold ${product.quantity < 20 ? 'text-red-600' : 'text-gray-800'}">${product.quantity} ${product.unit}</span></div>
              </div>
              <div class="flex flex-col sm:flex-row gap-2">
                <button onclick='editProduct(${JSON.stringify(product)})' class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all">تعديل</button>
                <button onclick="deleteProduct(${product.id})" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all">حذف</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div id="productModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800" id="modalTitle">إضافة منتج جديد</h3>
              <button onclick="closeProductModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
            </div>
            <form id="productForm" class="space-y-4">
              <input type="hidden" id="productId" />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">الاسم بالعربي *</label>
                  <input type="text" id="name_ar" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">الاسم بالإنجليزي</label>
                  <input type="text" id="name_en" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label class="block text-gray-700 font-semibold mb-2">الوصف</label>
                <textarea id="description" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"></textarea>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">السعر (ر.ع) *</label>
                  <input type="number" id="price" required step="0.001" min="0" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">الكمية *</label>
                  <input type="number" id="quantity" required min="0" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">الوحدة *</label>
                  <input type="text" id="unit" required value="كرتون" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label class="block text-gray-700 font-semibold mb-2">رابط الصورة</label>
                <input type="url" id="image_url" placeholder="https://example.com/image.jpg" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 mb-2" />
                <div class="flex items-center gap-3">
                  <input type="file" id="image_file" accept="image/*" class="block w-full text-sm text-gray-700" />
                  <button type="button" id="btnUploadImage" class="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-semibold">رفع صورة</button>
                </div>
                <p class="text-xs text-gray-500 mt-1">يمكنك لصق رابط الصورة مباشرة أو رفع صورة من جهازك</p>
                <div id="image_preview" class="mt-3 hidden">
                  <img id="image_preview_img" src="" alt="preview" class="w-24 h-24 object-cover rounded border" />
                </div>
              </div>
              <div id="statusField" class="hidden">
                <label class="block text-gray-700 font-semibold mb-2">الحالة</label>
                <select id="status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="available">متوفر</option>
                  <option value="unavailable">غير متوفر</option>
                </select>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 pt-4">
                <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all">حفظ</button>
                <button type="button" onclick="closeProductModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    const btnUpload = document.getElementById('btnUploadImage');
    const inputFile = document.getElementById('image_file');
    const preview = document.getElementById('image_preview');
    const previewImg = document.getElementById('image_preview_img');
    const urlInput = document.getElementById('image_url');

    // live preview when URL typed
    urlInput.addEventListener('input', () => {
      const v = urlInput.value.trim();
      if (v) { preview.classList.remove('hidden'); previewImg.src = v; }
    });

    // Compress image on the client before upload
    const compressImage = (file, maxW = 1280, maxH = 1280, quality = 0.8, outType = 'image/webp') => new Promise((resolve, reject) => {
      try {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          let { width, height } = img;
          const ratio = Math.min(maxW / width, maxH / height, 1);
          const targetW = Math.round(width * ratio);
          const targetH = Math.round(height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = targetW; canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, targetW, targetH);
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (!blob) return reject(new Error('فشل ضغط الصورة'));
            const ext = outType.includes('webp') ? 'webp' : (outType.includes('jpeg') ? 'jpg' : 'png');
            const outFile = new File([blob], (file.name || 'image').replace(/\.[^.]+$/, '') + '.' + ext, { type: outType });
            resolve(outFile);
          }, outType, quality);
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('تعذر قراءة الصورة')); };
        img.src = url;
      } catch (e) { reject(e); }
    });

    const doUpload = async (file) => {
      const compressed = await compressImage(file, 1280, 1280, 0.8, 'image/webp');
      
      // Convert compressed file to Base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(compressed);
      });
      
      const imageData = await base64Promise;
      const res = await axios.post('/api/uploads', { imageData });
      
      if (res.data && res.data.url) {
        urlInput.value = res.data.url;
        preview.classList.remove('hidden');
        previewImg.src = res.data.url;
        showNotification('تم رفع الصورة (مضغوطة) بنجاح');
      }
    };

    btnUpload.addEventListener('click', async () => {
      try {
        if (!inputFile.files || inputFile.files.length === 0) { showNotification('اختر ملف صورة أولاً', 'error'); return; }
        const file = inputFile.files[0];
        await doUpload(file);
      } catch (e) { showNotification(e.message || 'فشل رفع الصورة', 'error'); }
    });

    // رفع تلقائي بمجرد اختيار الصورة
    inputFile.addEventListener('change', async () => {
      if (!inputFile.files || inputFile.files.length === 0) return;
      try { await doUpload(inputFile.files[0]); } catch (e) { showNotification(e.message || 'فشل رفع الصورة', 'error'); }
    });

    // تجاوز تحقق input[type=url] بإعطاء قيمة افتراضية عندما تكون فارغة
    // سيجري استبدالها تلقائياً عند الرفع
    if (!urlInput.value) {
      urlInput.value = '';
      urlInput.setCustomValidity('');
    }

  } catch (error) { showNotification('حدث خطأ في تحميل المنتجات', 'error'); }
};

const showAddProductModal = () => {
  document.getElementById('productModal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  document.getElementById('statusField').classList.add('hidden');
};
const editProduct = (product) => {
  document.getElementById('productModal').classList.remove('hidden');
  document.getElementById('modalTitle').textContent = 'تعديل المنتج';
  document.getElementById('productId').value = product.id;
  document.getElementById('name_ar').value = product.name_ar;
  document.getElementById('name_en').value = product.name_en || '';
  document.getElementById('description').value = product.description || '';
  document.getElementById('price').value = product.price;
  document.getElementById('quantity').value = product.quantity;
  document.getElementById('unit').value = product.unit;
  document.getElementById('image_url').value = product.image_url || '';
  document.getElementById('status').value = product.status;
  document.getElementById('statusField').classList.remove('hidden');
  // Preview existing image if any
  const urlInput = document.getElementById('image_url');
  const preview = document.getElementById('image_preview');
  const previewImg = document.getElementById('image_preview_img');
  if (urlInput.value) { preview.classList.remove('hidden'); previewImg.src = urlInput.value; }
};
const closeProductModal = () => document.getElementById('productModal').classList.add('hidden');
const handleProductSubmit = async (e) => {
  e.preventDefault();
  const id = document.getElementById('productId').value;
  const data = {
    name_ar: document.getElementById('name_ar').value,
    name_en: document.getElementById('name_en').value,
    description: document.getElementById('description').value,
    price: parseFloat(document.getElementById('price').value),
    quantity: parseInt(document.getElementById('quantity').value),
    unit: document.getElementById('unit').value,
    image_url: document.getElementById('image_url').value,
    status: id ? document.getElementById('status').value : 'available'
  };
  try {
    if (id) {
      await API.request(`/products/${id}`, { method: 'PUT', data });
      showNotification('تم تحديث المنتج بنجاح');
    } else {
      await API.request('/products', { method: 'POST', data });
      showNotification('تم إضافة المنتج بنجاح');
    }
    closeProductModal();
    renderProductsManagement();
  } catch (err) { showNotification(err.message, 'error'); }
};
const deleteProduct = async (id) => {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  try { await API.request(`/products/${id}`, { method: 'DELETE' }); showNotification('تم حذف المنتج بنجاح'); renderProductsManagement(); }
  catch (e) { showNotification(e.message, 'error'); }
};

// ================= Shops Management =================
const renderShopsManagement = async () => {
  try {
    const shops = await API.request('/shops');
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="bg-white rounded-xl shadow-lg p-6">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
          <h2 class="text-2xl font-bold text-gray-800"><i class="fas fa-store ml-2"></i>إدارة المحلات</h2>
          <button onclick="showAddShopModal()" class="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg">إضافة محل جديد</button>
        </div>
        <div class="hidden md:block w-full overflow-x-auto">
          <table class="min-w-full table-fixed">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">اسم المستخدم</th>
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">كلمة المرور</th>
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">اسم المحل</th>
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الهاتف</th>
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">العنوان</th>
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">تاريخ التسجيل</th>
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              ${shops.map(shop => `
                <tr class="hover:bg-gray-50">
                  <td class="px-4 py-3 text-sm font-mono">${shop.username}</td>
                  <td class="px-4 py-3 text-sm font-mono">${shop.password || ''}</td>
                  <td class="px-4 py-3 text-sm font-semibold">${shop.name}</td>
                  <td class="px-4 py-3 text-sm">${shop.phone || '-'}</td>
                  <td class="px-4 py-3 text-sm">${shop.address || '-'}</td>
                  <td class="px-4 py-3"><span class="px-3 py-1 rounded-full text-xs font-semibold ${shop.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${shop.status === 'active' ? 'نشط' : 'معطل'}</span></td>
                  <td class="px-4 py-3 text-sm text-gray-600">${formatDate(shop.created_at)}</td>
                  <td class="px-4 py-3 space-x-2 space-x-reverse">
                    <button onclick='editShop(${JSON.stringify(shop)})' class="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-semibold transition-all">تعديل</button>
                    <button onclick="toggleShopStatus(${shop.id}, '${shop.status === 'active' ? 'inactive' : 'active'}')" class="px-3 py-1 rounded ${shop.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} text-sm font-semibold transition-all">${shop.status === 'active' ? 'تعطيل' : 'تفعيل'}</button>
                    <button onclick="deleteShop(${shop.id})" class="px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold transition-all">حذف</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div class="md:hidden space-y-3">
          ${shops.map(shop => `
            <div class="border border-gray-200 rounded-xl p-4">
              <div class="flex justify-between items-center mb-2">
                <div>
                  <p class="text-sm font-mono text-gray-600">${shop.username}</p>
                  <h4 class="font-bold">${shop.name}</h4>
                </div>
                <span class="px-2 py-1 rounded-full text-xs font-semibold ${shop.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${shop.status === 'active' ? 'نشط' : 'معطل'}</span>
              </div>
              <p class="text-sm text-gray-600">${shop.phone || '-'}</p>
              <p class="text-sm text-gray-600 mb-3">${shop.address || '-'}</p>
              <p class="text-sm text-gray-600"><span class="font-semibold">كلمة المرور:</span> <span class="font-mono">${shop.password || ''}</span></p>
              <div class="flex flex-col sm:flex-row gap-2">
                <button onclick='editShop(${JSON.stringify(shop)})' class="w-full sm:w-auto px-3 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-semibold transition-all">تعديل</button>
                <button onclick="toggleShopStatus(${shop.id}, '${shop.status === 'active' ? 'inactive' : 'active'}')" class="w-full sm:w-auto px-3 py-2 rounded ${shop.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} text-sm font-semibold transition-all">${shop.status === 'active' ? 'تعطيل' : 'تفعيل'}</button>
                <button onclick="deleteShop(${shop.id})" class="w-full sm:w-auto px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold transition-all">حذف</button>
              </div>
              <p class="text-xs text-gray-500 mt-2">${formatDate(shop.created_at)}</p>
            </div>
          `).join('')}
        </div>
      </div>
      <div id="shopModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800" id="shopModalTitle">إضافة محل جديد</h3>
              <button onclick="closeShopModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
            </div>
            <form id="shopForm" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">اسم المستخدم *</label>
                  <input type="text" id="shop_username" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">كلمة المرور *</label>
                  <input type="text" id="shop_password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label class="block text-gray-700 font-semibold mb-2">اسم المحل *</label>
                <input type="text" id="shop_name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">رقم الهاتف</label>
                  <input type="tel" id="shop_phone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">العنوان</label>
                  <input type="text" id="shop_address" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 pt-4">
                <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all">حفظ</button>
                <button type="button" onclick="closeShopModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    document.getElementById('shopForm').addEventListener('submit', handleShopSubmit);
  } catch (error) { showNotification('حدث خطأ في تحميل المحلات', 'error'); }
};

const showAddShopModal = () => { document.getElementById('shopModal').classList.remove('hidden'); const form = document.getElementById('shopForm'); form.reset(); form.dataset.id = ''; document.getElementById('shopModalTitle').textContent = 'إضافة محل جديد'; document.getElementById('shop_username').disabled = false; };
const closeShopModal = () => document.getElementById('shopModal').classList.add('hidden');
const handleShopSubmit = async (e) => {
  e.preventDefault();
  const title = document.getElementById('shopModalTitle').textContent;
  const isEdit = title.includes('تعديل');
  const payload = {
    username: document.getElementById('shop_username').value,
    password: document.getElementById('shop_password').value,
    name: document.getElementById('shop_name').value,
    phone: document.getElementById('shop_phone').value,
    address: document.getElementById('shop_address').value,
    status: undefined
  };
  try {
    if (isEdit) {
      const id = document.getElementById('shopForm').dataset.id;
      await API.request(`/shops/${id}`, { method: 'PUT', data: payload });
      showNotification('تم تحديث بيانات المحل بنجاح');
    } else {
      await API.request('/shops', { method: 'POST', data: payload });
      showNotification('تم إنشاء حساب المحل بنجاح');
    }
    closeShopModal(); renderShopsManagement();
  } catch (e) { showNotification(e.message, 'error'); }
};
const toggleShopStatus = async (id, status) => {
  try { await API.request(`/shops/${id}/status`, { method: 'PUT', data: { status } }); showNotification(status === 'active' ? 'تم تفعيل المحل' : 'تم تعطيل المحل'); renderShopsManagement(); }
  catch (e) { showNotification(e.message, 'error'); }
};

const editShop = (shop) => {
  document.getElementById('shopModal').classList.remove('hidden');
  document.getElementById('shopModalTitle').textContent = 'تعديل بيانات المحل';
  const form = document.getElementById('shopForm');
  form.dataset.id = shop.id;
  document.getElementById('shop_username').value = shop.username;
  document.getElementById('shop_username').disabled = false; // مسموح تعديل اسم المستخدم
  document.getElementById('shop_password').value = shop.password || '';
  document.getElementById('shop_name').value = shop.name || '';
  document.getElementById('shop_phone').value = shop.phone || '';
  document.getElementById('shop_address').value = shop.address || '';
};
const deleteShop = async (id) => {
  if (!confirm('سيتم حذف هذا المحل نهائيًا. هل أنت متأكد؟')) return;
  try { await API.request(`/shops/${id}`, { method: 'DELETE' }); showNotification('تم حذف المحل بنجاح'); renderShopsManagement(); }
  catch (e) { showNotification(e.message, 'error'); }
};

// ================= Orders Management =================
const renderOrdersManagement = async () => {
  try {
    const qs = (window.ordersFrom && window.ordersTo) ? `&from=${window.ordersFrom}&to=${window.ordersTo}` : '';
    const orders = await API.request(`/orders?role=admin${qs}`);
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-6"><i class="fas fa-shopping-cart ml-2"></i>إدارة الحجوزات</h2>
        <div class="bg-white rounded-xl shadow p-4 mb-6">
          <div class="flex flex-row flex-wrap gap-2 items-end">
            <div class="flex-1">
              <label class="block text-gray-700 text-sm font-semibold mb-1">من تاريخ</label>
              <input type="date" id="ordersFrom" value="${window.ordersFrom || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
            </div>
            <div class="flex-1">
              <label class="block text-gray-700 text-sm font-semibold mb-1">إلى تاريخ</label>
              <input type="date" id="ordersTo" value="${window.ordersTo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
            </div>
            <div class="flex flex-wrap gap-2">
              <button onclick="applyOrdersFilter()" class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold">تطبيق</button>
            </div>
          </div>
        </div>
        <div id="orders-list">${renderOrdersList(orders)}</div>
      </div>
      <div id="orderDetailsModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">تفاصيل الحجز</h3>
              <button onclick="closeOrderDetailsModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
            </div>
            <div id="orderDetailsContent"></div>
          </div>
        </div>
      </div>
    `;
  } catch (error) { showNotification('حدث خطأ في تحميل الحجوزات', 'error'); }
};

const renderOrdersList = (orders) => {
  if (!orders || orders.length === 0) return '<p class="text-gray-500 text-center py-8">لا توجد حجوزات</p>';
  return `
    <div class="hidden md:block w-full overflow-x-auto">
      <table class="min-w-full table-fixed">
        <thead>
          <tr class="bg-gray-50">
            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">رقم الحجز</th>
            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">المحل</th>
            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">المبلغ</th>
            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">التاريخ</th>
            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">إجراءات</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          ${orders.map(order => `
            <tr class="hover:bg-gray-50">
              <td class="px-4 py-3 text-sm">#${order.id}</td>
              <td class="px-4 py-3 text-sm font-semibold">${order.shop_name}</td>
              <td class="px-4 py-3 text-sm">${formatCurrency(order.total_amount)}</td>
              <td class="px-4 py-3"><span class="px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}">${getStatusText(order.status)}</span></td>
              <td class="px-4 py-3 text-sm text-gray-600">${formatDate(order.created_at)}</td>
              <td class="px-4 py-3 text-sm">
                <div class="flex flex-wrap gap-2">
                  <button onclick="viewOrderDetails(${order.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded">عرض</button>
                  ${order.status === 'pending' ? `
                    <button onclick="updateOrderStatus(${order.id}, 'confirmed')" class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded">تأكيد</button>
                    <button onclick="updateOrderStatus(${order.id}, 'cancelled')" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded">إلغاء</button>
                  ` : ''}
                  <button onclick="deleteOrder(${order.id})" class="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded">حذف</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="md:hidden space-y-3">
      ${orders.map(order => `
        <div class="border border-gray-200 rounded-xl p-4">
          <div class="flex justify-between items-center mb-2">
            <h4 class="font-bold">حجز #${order.id}</h4>
            <span class="px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}">${getStatusText(order.status)}</span>
          </div>
          <p class="text-sm text-gray-700 font-semibold mb-1">${order.shop_name}</p>
          <div class="flex justify-between text-sm mb-3">
            <span class="text-gray-600">${formatDate(order.created_at)}</span>
            <span class="font-bold text-green-600">${formatCurrency(order.total_amount)}</span>
          </div>
          <div class="flex flex-col sm:flex-row gap-2">
            <button onclick="viewOrderDetails(${order.id})" class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded">عرض التفاصيل</button>
            ${order.status === 'pending' ? `
              <button onclick="updateOrderStatus(${order.id}, 'confirmed')" class="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded">تأكيد</button>
              <button onclick="updateOrderStatus(${order.id}, 'cancelled')" class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded">إلغاء</button>
            ` : ''}
            <button onclick="deleteOrder(${order.id})" class="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded">حذف</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

const applyOrdersFilter = () => {
  window.ordersFrom = document.getElementById('ordersFrom').value || '';
  window.ordersTo = document.getElementById('ordersTo').value || '';
  renderOrdersManagement();
};
const exportOrders = (format) => {
  const from = window.ordersFrom || '';
  const to = window.ordersTo || '';
  const url = `/api/orders/export?format=${format}${from?`&from=${from}`:''}${to?`&to=${to}`:''}`;
  window.open(url, '_blank');
};
const showImportDialog = () => document.getElementById('importModal').classList.remove('hidden');
const closeImportDialog = () => document.getElementById('importModal').classList.add('hidden');
const doImport = async () => {
  try {
    const text = document.getElementById('importText').value;
    const payload = JSON.parse(text);
    const res = await API.request('/orders/import', { method: 'POST', data: payload });
    showNotification(`تم استيراد ${res.created.length} حجوزات بنجاح`);
    closeImportDialog();
    renderOrdersManagement();
  } catch (e) { showNotification(e.message || 'فشل الاستيراد', 'error'); }
};

const viewOrderDetails = async (orderId) => {
  try {
    const order = await API.request(`/orders/${orderId}`);
    document.getElementById('orderDetailsContent').innerHTML = `
      <div class="space-y-6">
        <div class="bg-gray-50 rounded-xl p-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><p class="text-gray-600 text-sm">رقم الحجز</p><p class="font-bold text-lg">#${order.id}</p></div>
            <div><p class="text-gray-600 text-sm">الحالة</p><span class="px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}">${getStatusText(order.status)}</span></div>
            <div><p class="text-gray-600 text-sm">اسم المحل</p><p class="font-semibold">${order.shop_name}</p></div>
            <div><p class="text-gray-600 text-sm">رقم الهاتف</p><p class="font-semibold">${order.shop_phone || '-'}</p></div>
            <div class="sm:col-span-2"><p class="text-gray-600 text-sm">العنوان</p><p class="font-semibold">${order.shop_address || '-'}</p></div>
            <div><p class="text-gray-600 text-sm">تاريخ الحجز</p><p class="font-semibold">${formatDate(order.created_at)}</p></div>
            <div><p class="text-gray-600 text-sm">المبلغ الإجمالي</p><p class="font-bold text-xl text-green-600">${formatCurrency(order.total_amount)}</p></div>
          </div>
          ${order.notes ? `<div class="mt-4"><p class="text-gray-600 text-sm">ملاحظات</p><p class="font-semibold">${order.notes}</p></div>` : ''}
        </div>
        <div>
          <h4 class="text-lg font-bold text-gray-800 mb-4">عناصر الحجز</h4>
          <div class="w-full overflow-x-auto">
            <table class="min-w-full table-fixed">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">المنتج</th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">السعر</th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الكمية</th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجمالي</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                ${order.items.map(item => `
                  <tr>
                    <td class="px-4 py-3 font-semibold">${item.product_name}</td>
                    <td class="px-4 py-3">${formatCurrency(item.price)}</td>
                    <td class="px-4 py-3">${item.quantity}</td>
                    <td class="px-4 py-3 font-bold">${formatCurrency(item.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr class="bg-gray-50 font-bold">
                  <td colspan="3" class="px-4 py-3 text-left">الإجمالي</td>
                  <td class="px-4 py-3 text-xl text-green-600">${formatCurrency(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
        ${order.receipt_url ? `<div><h4 class="text-lg font-bold text-gray-800 mb-2">إيصال الدفع</h4><p class="text-blue-600 break-all">${order.receipt_url}</p></div>` : ''}
      </div>
    `;
    document.getElementById('orderDetailsModal').classList.remove('hidden');
  } catch (e) { showNotification('حدث خطأ في تحميل تفاصيل الحجز', 'error'); }
};
const closeOrderDetailsModal = () => document.getElementById('orderDetailsModal').classList.add('hidden');
const updateOrderStatus = async (orderId, status) => {
  const confirmMsg = status === 'confirmed' ? 'هل تريد تأكيد هذا الحجز؟' : 'هل تريد إلغاء هذا الحجز؟';
  if (!confirm(confirmMsg)) return;
  try { await API.request(`/orders/${orderId}/status`, { method: 'PUT', data: { status } }); showNotification('تم تحديث حالة الحجز بنجاح'); window.ordersFrom=''; window.ordersTo=''; renderOrdersManagement(); updateOrdersPendingBadge(); }
  catch (e) { showNotification(e.message, 'error'); }
};
const deleteOrder = async (orderId) => {
  if (!confirm('سيتم حذف هذا الحجز نهائيًا. هل أنت متأكد؟')) return;
  try { await API.request(`/orders/${orderId}`, { method: 'DELETE' }); showNotification('تم حذف الحجز بنجاح'); window.ordersFrom=''; window.ordersTo=''; renderOrdersManagement(); updateOrdersPendingBadge(); }
  catch (e) { showNotification(e.message, 'error'); }
};

// ================= الإعدادات =================
const renderSettings = () => {
  const content = document.getElementById('admin-content');
  content.innerHTML = `
    <div class="space-y-6">
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-6"><i class="fas fa-cog ml-2"></i>الإعدادات</h2>
        <div class="space-y-6">
          <div class="bg-gray-50 rounded-xl p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">المستخدمون (لوحة تحكم المزرعة)</h3>
            <div id="usersTable">جارٍ التحميل...</div>
          </div>

          <div class="bg-gray-50 rounded-xl p-6">
            <h3 class="text-xl font-bold text-gray-800 mb-4">تصدير/استيراد البيانات</h3>
            <div class="space-y-3">
              <div class="flex flex-wrap gap-2">
                <button onclick="exportOrders('csv')" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">تصدير CSV</button>
                <button onclick="exportOrders('json')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold">تصدير JSON</button>
                <button onclick="showImportDialog()" class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold">استيراد</button>
              </div>
              <p class="text-sm text-gray-600">يمكن تحديد فترة التصدير من تبويب الحجوزات عبر فلاتر التاريخ.</p>
            </div>
          </div>
        </div>
      </div>

      <div id="importModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
          <div class="p-6 space-y-4">
            <div class="flex justify-between items-center mb-2">
              <h3 class="text-2xl font-bold text-gray-800">استيراد حجوزات</h3>
              <button onclick="closeImportDialog()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
            </div>
            <p class="text-sm text-gray-600">الصيغة: JSON يحتوي على مصفوفة orders. سيتم خصم المخزون تلقائياً للحجوزات غير الملغاة.</p>
            <textarea id="importText" rows="10" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" placeholder='{"orders":[{"shop_username":"shop1","status":"pending","items":[{"product_id":1,"quantity":2,"price":5.5}]}]}'></textarea>
            <div class="flex gap-2">
              <button onclick="doImport()" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold">استيراد الآن</button>
              <button onclick="closeImportDialog()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold">إلغاء</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // تحميل جدول المستخدمين
  loadUsersTable();
};

// تحميل وبناء جدول المستخدمين في الإعدادات
async function loadUsersTable() {
  if (!currentUser || currentUser.role !== 'admin') {
    const el = document.getElementById('admin-content');
    if (el) el.innerHTML = '<div class="bg-red-50 border-r-4 border-red-600 rounded-xl p-6"><p class="text-red-700 font-semibold">ليست لديك صلاحية الوصول إلى هذه الصفحة</p></div>';
    return;
  }
  try {
    const users = await API.request('/users');
    const el = document.getElementById('usersTable');
    if (!users || users.length === 0) { el.innerHTML = '<p class="text-gray-500">لا يوجد مستخدمون</p>'; return; }
    el.innerHTML = `
      <div class="hidden md:block w-full overflow-x-auto">
        <table class="min-w-full table-fixed">
          <thead>
            <tr class="bg-gray-50">
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">المعرف</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">اسم المستخدم</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">كلمة المرور</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الاسم</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الدور</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الحالة</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الإجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            ${users.map(u => `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3 text-sm">${u.id}</td>
                <td class="px-4 py-3 text-sm font-mono">${u.username}</td>
                <td class="px-4 py-3 text-sm font-mono">${u.password || ''}</td>
                <td class="px-4 py-3 text-sm">${u.name}</td>
                <td class="px-4 py-3 text-sm">${u.role === 'admin' ? 'مدير' : 'محل'}</td>
                <td class="px-4 py-3 text-sm">${u.status === 'active' ? '<span class=\"px-2 py-1 text-xs rounded bg-green-100 text-green-700\">نشط</span>' : '<span class=\"px-2 py-1 text-xs rounded bg-red-100 text-red-700\">معطل</span>'}</td>
                <td class="px-4 py-3 text-sm space-x-2 space-x-reverse">
                  <button onclick='editUser(${JSON.stringify(u)})' class="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-semibold transition-all">تعديل</button>
                  ${u.role !== 'admin' ? `<button onclick=\"deleteUser(${u.id})\" class=\"px-3 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold transition-all\">حذف</button>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <div class="md:hidden space-y-3">
        ${users.map(u => `
          <div class="border border-gray-200 rounded-xl p-4">
            <div class="flex justify-between items-center mb-2">
              <div>
                <p class="text-sm font-mono text-gray-600">${u.username}</p>
                <h4 class="font-bold">${u.name}</h4>
              </div>
              <span class="px-2 py-1 rounded-full text-xs font-semibold ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${u.status === 'active' ? 'نشط' : 'معطل'}</span>
            </div>
            <p class="text-sm text-gray-600 mb-1"><span class="font-semibold">الدور:</span> ${u.role === 'admin' ? 'مدير' : 'محل'}</p>
            <p class="text-sm text-gray-600 mb-1"><span class="font-semibold">كلمة المرور:</span> <span class="font-mono">${u.password || ''}</span></p>
            <div class="flex flex-col sm:flex-row gap-2 mt-2">
              <button onclick='editUser(${JSON.stringify(u)})' class="w-full sm:w-auto px-3 py-2 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 text-sm font-semibold transition-all">تعديل</button>
              ${u.role !== 'admin' ? `<button onclick=\"deleteUser(${u.id})\" class=\"w-full sm:w-auto px-3 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 text-sm font-semibold transition-all\">حذف</button>` : ''}
            </div>
            <p class="text-xs text-gray-500 mt-2">ID: ${u.id}</p>
          </div>
        `).join('')}
      </div>

      <div id="userModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800" id="userModalTitle">تعديل المستخدم</h3>
              <button onclick="closeUserModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
            </div>
            <form id="userForm" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">اسم المستخدم *</label>
                  <input type="text" id="user_username" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">كلمة المرور (اتركها فارغة بدون تغيير)</label>
                  <input type="text" id="user_password" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">الاسم *</label>
                  <input type="text" id="user_name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">الدور</label>
                  <select id="user_role" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="admin">مدير</option>
                    <option value="shop">محل</option>
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">الهاتف</label>
                  <input type="tel" id="user_phone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">العنوان</label>
                  <input type="text" id="user_address" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label class="block text-gray-700 font-semibold mb-2">الحالة</label>
                <select id="user_status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="active">نشط</option>
                  <option value="inactive">معطل</option>
                </select>
              </div>
              <div class="flex flex-col sm:flex-row gap-2 pt-4">
                <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all">حفظ</button>
                <button type="button" onclick="closeUserModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold transition-all">إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl p-6 mt-6">
        <h3 class="text-lg font-bold text-gray-800 mb-4">إضافة مدير جديد</h3>
        <form id="addAdminForm" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 font-semibold mb-2">اسم المستخدم *</label>
              <input type="text" id="new_admin_username" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label class="block text-gray-700 font-semibold mb-2">كلمة المرور *</label>
              <input type="text" id="new_admin_password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-gray-700 font-semibold mb-2">الاسم *</label>
              <input type="text" id="new_admin_name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label class="block text-gray-700 font-semibold mb-2">الهاتف</label>
              <input type="tel" id="new_admin_phone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label class="block text-gray-700 font-semibold mb-2">العنوان</label>
            <input type="text" id="new_admin_address" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
          </div>
          <div class="flex flex-col sm:flex-row gap-2 pt-2">
            <button type="submit" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-all">إضافة المدير</button>
          </div>
        </form>
      </div>
    `;

    document.getElementById('userForm')?.addEventListener('submit', handleUserSubmit);
    document.getElementById('addAdminForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const payload = {
          username: document.getElementById('new_admin_username').value,
          password: document.getElementById('new_admin_password').value,
          name: document.getElementById('new_admin_name').value,
          phone: document.getElementById('new_admin_phone').value,
          address: document.getElementById('new_admin_address').value
        };
        await API.request('/users', { method: 'POST', data: payload });
        showNotification('تم إنشاء حساب المدير بنجاح');
        loadUsersTable();
      } catch (e) { showNotification(e.message, 'error'); }
    });
  } catch (e) {
    showNotification('حدث خطأ في تحميل المستخدمين', 'error');
  }
}

function editUser(user) {
  document.getElementById('userModal').classList.remove('hidden');
  document.getElementById('userModalTitle').textContent = 'تعديل المستخدم';
  const form = document.getElementById('userForm');
  form.dataset.id = user.id;
  document.getElementById('user_username').value = user.username;
  document.getElementById('user_password').value = '';
  document.getElementById('user_name').value = user.name || '';
  document.getElementById('user_role').value = user.role || 'shop';
  document.getElementById('user_phone').value = user.phone || '';
  document.getElementById('user_address').value = user.address || '';
  document.getElementById('user_status').value = user.status || 'active';
}

function closeUserModal() { document.getElementById('userModal').classList.add('hidden'); }

async function handleUserSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('userForm').dataset.id;
  const payload = {
    username: document.getElementById('user_username').value,
    password: document.getElementById('user_password').value, // يمكن أن تكون فارغة لعدم التغيير
    name: document.getElementById('user_name').value,
    role: document.getElementById('user_role').value,
    phone: document.getElementById('user_phone').value,
    address: document.getElementById('user_address').value,
    status: document.getElementById('user_status').value
  };
  try {
    await API.request(`/users/${id}`, { method: 'PUT', data: payload });
    showNotification('تم تحديث بيانات المستخدم بنجاح');
    closeUserModal();
    loadUsersTable();
  } catch (e) { showNotification(e.message, 'error'); }
}

async function deleteUser(id) {
  if (!confirm('سيتم حذف هذا المستخدم نهائيًا. هل أنت متأكد؟')) return;
  try {
    await API.request(`/users/${id}`, { method: 'DELETE' });
    showNotification('تم حذف المستخدم بنجاح');
    loadUsersTable();
  } catch (e) { showNotification(e.message, 'error'); }
}

// expose handlers
window.editUser = editUser;
window.closeUserModal = closeUserModal;

// ================= Sales Reports =================
const renderSalesReports = async () => {
  try {
    const qs = (window.reportFrom && window.reportTo) ? `?from=${window.reportFrom}&to=${window.reportTo}` : '';
    const salesData = await API.request(`/stats/sales${qs}`);
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-6"><i class="fas fa-chart-bar ml-2"></i>تقارير المبيعات</h2>
          <div class="bg-white rounded-xl p-4 mb-4 border border-gray-200">
            <div class="flex flex-row flex-wrap gap-2 items-end">
              <div class="flex-1">
                <label class="block text-gray-700 text-sm font-semibold mb-1">من تاريخ</label>
                <input type="date" id="reportFrom" value="${window.reportFrom || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <div class="flex-1">
                <label class="block text-gray-700 text-sm font-semibold mb-1">إلى تاريخ</label>
                <input type="date" id="reportTo" value="${window.reportTo || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              <button onclick="applySalesFilter()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold">تطبيق</button>
            </div>
          </div>
          <div class="bg-gray-50 rounded-xl p-6">
            <canvas id="salesChart" height="100"></canvas>
          </div>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">المبيعات حسب المنتج</h3>
          <div class="w-full overflow-x-auto">
            <table class="min-w-full table-fixed">
              <thead>
                <tr class="bg-gray-50">
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">المنتج</th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">الكمية المباعة</th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">عدد الطلبات</th>
                  <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">إجمالي المبيعات</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                ${salesData.map(item => `
                  <tr class="hover:bg-gray-50">
                    <td class="px-4 py-3 font-semibold">${item.product_name}</td>
                    <td class="px-4 py-3">${item.total_quantity}</td>
                    <td class="px-4 py-3">${item.order_count}</td>
                    <td class="px-4 py-3 font-bold text-green-600">${formatCurrency(item.total_sales)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    // Chart
    const ctx = document.getElementById('salesChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: salesData.map(i => i.product_name),
        datasets: [{ label: 'المبيعات (ر.ع)', data: salesData.map(i => i.total_sales), backgroundColor: 'rgba(34,197,94,0.8)', borderColor: 'rgb(34,197,94)', borderWidth: 2 }]
      },
      options: { responsive: true, maintainAspectRatio: true, scales: { y: { beginAtZero: true, ticks: { callback: v => `${parseFloat(v).toFixed(3)} ر.ع` } } } }
    });
  } catch (e) { showNotification('حدث خطأ في تحميل التقارير', 'error'); }
};
const applyDashboardFilter = () => {
  window.dashFrom = document.getElementById('dashFrom').value || '';
  window.dashTo = document.getElementById('dashTo').value || '';
  renderAdminDashboard();
};
const applySalesFilter = () => {
  window.reportFrom = document.getElementById('reportFrom').value || '';
  window.reportTo = document.getElementById('reportTo').value || '';
  renderSalesReports();
};

// ================= Shop Dashboard =================
const renderShopDashboard = async () => {
  const updateBadgeIfReady = () => { try { updateCartBadge(); } catch (_) {} }
  try {
    const products = await API.request('/products?status=available');
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        <header class="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg sticky top-0 z-40">
          <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="bg-white/20 p-3 rounded-full"><i class="fas fa-store text-2xl"></i></div>
                <div>
                  <h1 class="text-2xl font-bold">متجر الخضروات</h1>
                  <p class="text-green-100 text-sm">${currentUser.name}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <button id="cartButton" onclick="showCart()" class="relative bg-white/20 hover:bg-white/30 p-3 rounded-full transition focus:outline-none focus:ring-2 focus:ring-white/70">
                  <i class="fas fa-shopping-cart text-xl"></i>
                  <span id="cartCountBadge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center" style="${cart.length > 0 ? '' : 'display:none'}">${cart.length}</span>
                </button>
                <button onclick="logout()" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"><i class="fas fa-sign-out-alt ml-2"></i>خروج</button>
              </div>
            </div>
          </div>
        </header>
        <div class="bg-white shadow-md">
          <div class="container mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex gap-2">
              <button onclick="showShopTab('products')" class="shop-tab px-4 sm:px-6 py-4 font-semibold border-b-4 border-green-600 text-green-700" data-tab="products"><i class="fas fa-leaf ml-2"></i>المنتجات المتاحة</button>
              <button onclick="showShopTab('orders')" class="shop-tab px-4 sm:px-6 py-4 font-semibold border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="orders"><i class="fas fa-list ml-2"></i>حجوزاتي</button>
            </div>
          </div>
        </div>
        <div class="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div id="shop-content">
            <div class="mb-6">
              <h2 class="text-3xl font-bold text-gray-800 mb-2">المنتجات المتاحة</h2>
              <p class="text-gray-600">اختر المنتجات وأضفها للسلة</p>
            </div>
            <div id="products-grid" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              ${products.map(product => `
                <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden">
                  ${product.image_url ? `
                    <div class=\"w-full h-32 bg-gray-100\">
                      <img src=\"${product.image_url}\" alt=\"${product.name_ar}\" class=\"w-full h-32 object-cover\" />
                    </div>
                  ` : `
                    <div class=\"bg-gradient-to-br from-green-400 to-green-600 h-32 flex items-center justify-center\">
                      <i class=\"fas fa-leaf text-white text-5xl\"></i>
                    </div>
                  `}
                  <div class="p-5">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${product.name_ar}</h3>
                    ${product.name_en ? `<p class="text-gray-600 text-sm mb-3">${product.name_en}</p>` : ''}
                    ${product.description ? `<p class="text-gray-600 text-sm mb-4">${product.description}</p>` : ''}
                    <div class="space-y-3 mb-4">
                      <div class="flex justify-between items-center"><span class="text-gray-600 font-semibold">السعر:</span><span class="text-2xl font-bold text-green-600">${formatCurrency(product.price)}</span></div>
                      <div class="flex justify-between items-center"><span class="text-gray-600 font-semibold">المتوفر:</span><span class="font-bold ${product.quantity < 20 ? 'text-red-600' : 'text-gray-800'}">${product.quantity} ${product.unit}</span></div>
                    </div>
                    <div class="flex items-center gap-2 mb-4">
                      <label class="text-gray-700 font-semibold whitespace-nowrap">الكمية:</label>
                      <input type="number" id="qty-${product.id}" min="1" max="${product.quantity}" value="1" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                    </div>
                    <button onclick="addToCart(${product.id}, '${product.name_ar}', ${product.price}, '${product.unit}', ${product.quantity})" class="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-lg font-bold transition-all shadow-lg" ${product.quantity === 0 ? 'disabled' : ''}>
                      <i class="fas fa-cart-plus ml-2"></i>${product.quantity === 0 ? 'نفذت الكمية' : 'أضف للسلة'}
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div id="cartModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-800"><i class="fas fa-shopping-cart ml-2"></i>سلة التسوق</h3>
                <button onclick="closeCart()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
              </div>
              <div id="cartContent"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (e) { showNotification('حدث خطأ في تحميل المنتجات', 'error'); }
};

const showShopTab = (tab) => {
  document.querySelectorAll('.shop-tab').forEach(btn => {
    if (btn.dataset.tab === tab) { btn.classList.add('border-green-600','text-green-700'); btn.classList.remove('border-transparent','text-gray-600'); }
    else { btn.classList.remove('border-green-600','text-green-700'); btn.classList.add('border-transparent','text-gray-600'); }
  });
  if (tab === 'products') renderShopDashboard(); else if (tab === 'orders') renderShopOrders();
};

const addToCart = (productId, name, price, unit, maxQty) => {
  const qtyInput = document.getElementById(`qty-${productId}`);
  const quantity = parseInt(qtyInput.value);
  if (quantity <= 0 || quantity > maxQty) { showNotification('الكمية المطلوبة غير صحيحة', 'error'); return; }
  const existing = cart.find(i => i.product_id === productId);
  if (existing) existing.quantity = quantity; else cart.push({ product_id: productId, name, price, unit, quantity });
  updateCartBadge();
  showNotification(`تمت إضافة ${name} للسلة`);
  qtyInput.value = 1;
};

const showCart = () => {
  const el = document.getElementById('cartContent');
  if (cart.length === 0) {
    el.innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-shopping-cart text-gray-300 text-6xl mb-4"></i>
        <p class="text-gray-500 text-lg">السلة فارغة</p>
      </div>`;
  } else {
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    updateCartBadge();
    el.innerHTML = `
      <div class="space-y-4 mb-6">
        ${cart.map((item, idx) => `
          <div class="flex flex-col sm:flex-row sm:items-center justify-between border border-gray-200 rounded-xl p-4 gap-3">
            <div class="flex-1">
              <h4 class="font-bold text-lg">${item.name}</h4>
              <p class="text-gray-600">${formatCurrency(item.price)} × ${item.quantity} ${item.unit}</p>
            </div>
            <div class="flex items-center gap-4">
              <p class="font-bold text-xl text-green-600">${formatCurrency(item.price * item.quantity)}</p>
              <button onclick="removeFromCart(${idx})" class="text-red-600 hover:text-red-700"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="border-t border-gray-200 pt-4 mb-6">
        <div class="flex justify-between items-center mb-4">
          <span class="text-xl font-bold">الإجمالي:</span>
          <span class="text-3xl font-bold text-green-600">${formatCurrency(total)}</span>
        </div>
        <div class="mb-4">
          <label class="block text-gray-700 font-semibold mb-2">ملاحظات (اختياري)</label>
          <textarea id="orderNotes" rows="3" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" placeholder="أضف أي ملاحظات للطلب..."></textarea>
        </div>
      </div>
      <div class="flex flex-col sm:flex-row gap-2">
        <button onclick="confirmOrder()" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all"><i class="fas fa-check ml-2"></i>تأكيد الحجز</button>
        <button onclick="cart = []; closeCart();" class="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-all"><i class="fas fa-trash ml-2"></i>إفراغ السلة</button>
      </div>`;
  }
  document.getElementById('cartModal').classList.remove('hidden');
};
const closeCart = () => document.getElementById('cartModal').classList.add('hidden');
const removeFromCart = (index) => { cart.splice(index, 1); updateCartBadge(); showCart(); if (cart.length === 0) renderShopDashboard(); };
const confirmOrder = async () => {
  // at confirm we will clear cart after success; badge will refresh on reload as well

  if (cart.length === 0) return;
  const notes = document.getElementById('orderNotes').value;
  try {
    await API.request('/orders', { method: 'POST', data: { shop_id: currentUser.id, items: cart, notes } });
    showNotification('تم إنشاء الحجز بنجاح'); cart = []; updateCartBadge(); closeCart(); renderShopOrders();
  } catch (e) { showNotification(e.message, 'error'); }
};

const renderShopOrders = async () => {
  try {
    const orders = await API.request(`/orders?userId=${currentUser.id}&role=shop`);
    const content = document.getElementById('shop-content');
    content.innerHTML = `
      <div class="space-y-6">
        <div class="mb-6"><h2 class="text-3xl font-bold text-gray-800 mb-2">حجوزاتي</h2><p class="text-gray-600">عرض وإدارة حجوزاتك</p></div>
        ${orders.length === 0 ? `
          <div class="bg-white rounded-xl shadow-lg p-12 text-center">
            <i class="fas fa-shopping-bag text-gray-300 text-6xl mb-4"></i>
            <p class="text-gray-500 text-lg">لا توجد حجوزات بعد</p>
          </div>` : `
          <div class="space-y-4">
            ${orders.map(order => `
              <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-4">
                  <div>
                    <h3 class="text-2xl font-bold text-gray-800">حجز #${order.id}</h3>
                    <p class="text-gray-500 text-sm">${formatDate(order.created_at)}</p>
                  </div>
                  <span class="px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}">${getStatusText(order.status)}</span>
                </div>
                <div class="mb-4"><p class="text-gray-600">المبلغ الإجمالي:</p><p class="text-3xl font-bold text-green-600">${formatCurrency(order.total_amount)}</p></div>
                ${order.notes ? `<p class="text-gray-600 text-sm mb-4"><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
                <button onclick="viewOrderDetails(${order.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">عرض التفاصيل</button>
              </div>`).join('')}
          </div>`}
      </div>
      <div id="orderDetailsModal" class="hidden fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">تفاصيل الحجز</h3>
              <button onclick="closeOrderDetailsModal()" class="text-gray-500 hover:text-gray-700"><i class="fas fa-times text-2xl"></i></button>
            </div>
            <div id="orderDetailsContent"></div>
          </div>
        </div>
      </div>
    `;
  } catch (e) { showNotification('حدث خطأ في تحميل الحجوزات', 'error'); }
};

// Helper status
const getStatusColor = (status) => {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'confirmed': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};
const getStatusText = (status) => {
  switch (status) {
    case 'pending': return 'قيد الانتظار';
    case 'confirmed': return 'مؤكد';
    case 'cancelled': return 'ملغي';
    default: return status;
  }
};

// تحديث شارة الحجوزات في التبويب مباشرةً بعد العمليات
async function updateOrdersPendingBadge() {
  try {
    const pending = await API.request('/orders?role=admin&status=pending');
    const count = Array.isArray(pending) ? pending.length : 0;
    const badge = document.getElementById('ordersPendingBadge');
    if (!badge) return;
    badge.textContent = count;
    badge.style.display = count > 0 ? '' : 'none';
  } catch (_) {
    // تجاهل الأخطاء الصامتة
  }
}

// Init
if (checkAuth()) { if (currentUser.role === 'admin') renderAdminDashboard(); else renderShopDashboard(); } else { renderLoginPage(); }

// Expose to window
window.logout = logout;
window.showAdminTab = showAdminTab;
window.showShopTab = showShopTab;
window.showAddProductModal = showAddProductModal;
window.editProduct = editProduct;
window.closeProductModal = closeProductModal;
window.deleteProduct = deleteProduct;
window.showAddShopModal = showAddShopModal;
window.closeShopModal = closeShopModal;
window.toggleShopStatus = toggleShopStatus;
window.deleteShop = deleteShop;
window.applyDashboardFilter = applyDashboardFilter;
window.applySalesFilter = applySalesFilter;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.addToCart = addToCart;
window.showCart = showCart;
window.closeCart = closeCart;
window.removeFromCart = removeFromCart;
window.confirmOrder = confirmOrder;

// تحديث شارة السلة حسب عدد العناصر
function updateCartBadge() {
  const badge = document.getElementById('cartCountBadge');
  if (!badge) return;
  const count = cart.length;
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}
window.updateCartBadge = updateCartBadge;
window.applyOrdersFilter = applyOrdersFilter;
// نقل التصدير/الاستيراد إلى تبويب الإعدادات
window.exportOrders = exportOrders;
window.showImportDialog = showImportDialog;
window.closeImportDialog = closeImportDialog;
window.doImport = doImport;
window.renderSettings = renderSettings;
window.editShop = editShop;
