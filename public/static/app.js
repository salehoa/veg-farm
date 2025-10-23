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
      console.error('API Error:', error);
      if (error.response) {
        throw new Error(error.response.data.error || 'حدث خطأ في الاتصال بالخادم');
      }
      throw new Error('حدث خطأ في الاتصال بالخادم');
    }
  }
};

// Format currency
const formatCurrency = (amount) => {
  return `${parseFloat(amount).toFixed(3)} ر.ع`;
};

// Format date
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-OM', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Show notification
const showNotification = (message, type = 'success') => {
  const bg = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const notification = document.createElement('div');
  notification.className = `fixed top-4 left-1/2 transform -translate-x-1/2 ${bg} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
};

// Check auth
const checkAuth = () => {
  const userData = localStorage.getItem('user');
  if (userData) {
    currentUser = JSON.parse(userData);
    return true;
  }
  return false;
};

// Logout
const logout = () => {
  localStorage.removeItem('user');
  currentUser = null;
  cart = [];
  renderLoginPage();
};

// ============== Login Page ==============
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
            <input 
              type="text" 
              id="username" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="أدخل اسم المستخدم"
            />
          </div>
          
          <div>
            <label class="block text-gray-700 font-semibold mb-2">
              <i class="fas fa-lock ml-2"></i>
              كلمة المرور
            </label>
            <input 
              type="password" 
              id="password" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="أدخل كلمة المرور"
            />
          </div>
          
          <button 
            type="submit"
            class="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg font-bold hover:from-green-700 hover:to-green-800 transition-all shadow-lg"
          >
            <i class="fas fa-sign-in-alt ml-2"></i>
            تسجيل الدخول
          </button>
        </form>
        
        <div class="mt-6 p-4 bg-green-50 rounded-lg">
          <p class="text-sm text-gray-600 text-center">
            <i class="fas fa-info-circle ml-1"></i>
            حسابات تجريبية:
          </p>
          <p class="text-xs text-gray-500 mt-2">المزرعة: admin / admin123</p>
          <p class="text-xs text-gray-500">المحل: shop1 / shop123</p>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
};

const handleLogin = async (e) => {
  e.preventDefault();
  
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;
  
  try {
    const data = await API.request('/auth/login', {
      method: 'POST',
      data: { username, password }
    });
    
    currentUser = data.user;
    localStorage.setItem('user', JSON.stringify(currentUser));
    
    showNotification('تم تسجيل الدخول بنجاح');
    
    if (currentUser.role === 'admin') {
      renderAdminDashboard();
    } else {
      renderShopDashboard();
    }
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

// ============== Admin Dashboard ==============
const renderAdminDashboard = async () => {
  try {
    const stats = await API.request('/stats/dashboard');
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        <!-- Header -->
        <header class="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
          <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 space-x-reverse">
                <div class="bg-white bg-opacity-20 p-3 rounded-full">
                  <i class="fas fa-seedling text-2xl"></i>
                </div>
                <div>
                  <h1 class="text-2xl font-bold">لوحة تحكم المزرعة</h1>
                  <p class="text-green-100 text-sm">${currentUser.name}</p>
                </div>
              </div>
              <button onclick="logout()" class="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all">
                <i class="fas fa-sign-out-alt ml-2"></i>
                خروج
              </button>
            </div>
          </div>
        </header>

        <!-- Navigation Tabs -->
        <div class="bg-white shadow-md">
          <div class="container mx-auto px-4">
            <div class="flex space-x-2 space-x-reverse overflow-x-auto">
              <button onclick="showAdminTab('overview')" class="admin-tab px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-green-600 text-green-700" data-tab="overview">
                <i class="fas fa-home ml-2"></i>نظرة عامة
              </button>
              <button onclick="showAdminTab('products')" class="admin-tab px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="products">
                <i class="fas fa-leaf ml-2"></i>المنتجات
              </button>
              <button onclick="showAdminTab('shops')" class="admin-tab px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="shops">
                <i class="fas fa-store ml-2"></i>المحلات
              </button>
              <button onclick="showAdminTab('orders')" class="admin-tab px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="orders">
                <i class="fas fa-shopping-cart ml-2"></i>الحجوزات
              </button>
              <button onclick="showAdminTab('reports')" class="admin-tab px-6 py-4 font-semibold whitespace-nowrap border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="reports">
                <i class="fas fa-chart-bar ml-2"></i>التقارير
              </button>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="container mx-auto px-4 py-8">
          <div id="admin-content">
            <!-- Stats Cards -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            <!-- Low Stock Alert -->
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

            <!-- Recent Orders -->
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
      <div class="overflow-x-auto">
        <table class="w-full">
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
    `;
  } catch (error) {
    console.error('Error loading orders:', error);
  }
};

const showAdminTab = (tab) => {
  // Update active tab
  document.querySelectorAll('.admin-tab').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('border-green-600', 'text-green-700');
      btn.classList.remove('border-transparent', 'text-gray-600');
    } else {
      btn.classList.remove('border-green-600', 'text-green-700');
      btn.classList.add('border-transparent', 'text-gray-600');
    }
  });
  
  // Load content
  switch(tab) {
    case 'overview':
      renderAdminDashboard();
      break;
    case 'products':
      renderProductsManagement();
      break;
    case 'shops':
      renderShopsManagement();
      break;
    case 'orders':
      renderOrdersManagement();
      break;
    case 'reports':
      renderSalesReports();
      break;
  }
};

// ============== Products Management ==============
const renderProductsManagement = async () => {
  try {
    const products = await API.request('/products');
    
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="bg-white rounded-xl shadow-lg p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-leaf ml-2"></i>
            إدارة المنتجات
          </h2>
          <button onclick="showAddProductModal()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg">
            <i class="fas fa-plus ml-2"></i>
            إضافة منتج جديد
          </button>
        </div>
        
        <div id="products-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${products.map(product => `
            <div class="border border-gray-200 rounded-xl p-5 hover:shadow-xl transition-all">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-bold text-gray-800">${product.name_ar}</h3>
                  <p class="text-gray-600 text-sm">${product.name_en || ''}</p>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${product.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}">
                  ${product.status === 'available' ? 'متوفر' : 'غير متوفر'}
                </span>
              </div>
              
              ${product.description ? `<p class="text-gray-600 text-sm mb-4">${product.description}</p>` : ''}
              
              <div class="space-y-2 mb-4">
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">السعر:</span>
                  <span class="text-xl font-bold text-green-600">${formatCurrency(product.price)}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">الكمية:</span>
                  <span class="font-bold ${product.quantity < 20 ? 'text-red-600' : 'text-gray-800'}">${product.quantity} ${product.unit}</span>
                </div>
              </div>
              
              <div class="flex space-x-2 space-x-reverse">
                <button onclick='editProduct(${JSON.stringify(product)})' class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all">
                  <i class="fas fa-edit ml-1"></i>
                  تعديل
                </button>
                <button onclick="deleteProduct(${product.id})" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all">
                  <i class="fas fa-trash ml-1"></i>
                  حذف
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      
      <!-- Add/Edit Product Modal -->
      <div id="productModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800" id="modalTitle">إضافة منتج جديد</h3>
              <button onclick="closeProductModal()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>
            
            <form id="productForm" class="space-y-4">
              <input type="hidden" id="productId" />
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <input type="url" id="image_url" placeholder="https://example.com/image.jpg" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              
              <div id="statusField" class="hidden">
                <label class="block text-gray-700 font-semibold mb-2">الحالة</label>
                <select id="status" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500">
                  <option value="available">متوفر</option>
                  <option value="unavailable">غير متوفر</option>
                </select>
              </div>
              
              <div class="flex space-x-2 space-x-reverse pt-4">
                <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all">
                  <i class="fas fa-save ml-2"></i>
                  حفظ
                </button>
                <button type="button" onclick="closeProductModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold transition-all">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
  } catch (error) {
    showNotification('حدث خطأ في تحميل المنتجات', 'error');
  }
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
};

const closeProductModal = () => {
  document.getElementById('productModal').classList.add('hidden');
};

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
      await API.request(`/products/${id}`, {
        method: 'PUT',
        data
      });
      showNotification('تم تحديث المنتج بنجاح');
    } else {
      await API.request('/products', {
        method: 'POST',
        data
      });
      showNotification('تم إضافة المنتج بنجاح');
    }
    
    closeProductModal();
    renderProductsManagement();
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

const deleteProduct = async (id) => {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
  
  try {
    await API.request(`/products/${id}`, {
      method: 'DELETE'
    });
    showNotification('تم حذف المنتج بنجاح');
    renderProductsManagement();
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

// ============== Shops Management ==============
const renderShopsManagement = async () => {
  try {
    const shops = await API.request('/shops');
    
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="bg-white rounded-xl shadow-lg p-6">
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-store ml-2"></i>
            إدارة المحلات
          </h2>
          <button onclick="showAddShopModal()" class="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-lg">
            <i class="fas fa-plus ml-2"></i>
            إضافة محل جديد
          </button>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead>
              <tr class="bg-gray-50">
                <th class="px-4 py-3 text-right text-sm font-semibold text-gray-700">اسم المستخدم</th>
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
                  <td class="px-4 py-3 text-sm font-semibold">${shop.name}</td>
                  <td class="px-4 py-3 text-sm">${shop.phone || '-'}</td>
                  <td class="px-4 py-3 text-sm">${shop.address || '-'}</td>
                  <td class="px-4 py-3">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${shop.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                      ${shop.status === 'active' ? 'نشط' : 'معطل'}
                    </span>
                  </td>
                  <td class="px-4 py-3 text-sm text-gray-600">${formatDate(shop.created_at)}</td>
                  <td class="px-4 py-3">
                    <button onclick="toggleShopStatus(${shop.id}, '${shop.status === 'active' ? 'inactive' : 'active'}')" 
                      class="px-3 py-1 rounded ${shop.status === 'active' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'} text-sm font-semibold transition-all">
                      ${shop.status === 'active' ? 'تعطيل' : 'تفعيل'}
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Add Shop Modal -->
      <div id="shopModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">إضافة محل جديد</h3>
              <button onclick="closeShopModal()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>
            
            <form id="shopForm" class="space-y-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">اسم المستخدم *</label>
                  <input type="text" id="shop_username" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">كلمة المرور *</label>
                  <input type="password" id="shop_password" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              
              <div>
                <label class="block text-gray-700 font-semibold mb-2">اسم المحل *</label>
                <input type="text" id="shop_name" required class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
              </div>
              
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">رقم الهاتف</label>
                  <input type="tel" id="shop_phone" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                
                <div>
                  <label class="block text-gray-700 font-semibold mb-2">العنوان</label>
                  <input type="text" id="shop_address" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              
              <div class="flex space-x-2 space-x-reverse pt-4">
                <button type="submit" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all">
                  <i class="fas fa-save ml-2"></i>
                  حفظ
                </button>
                <button type="button" onclick="closeShopModal()" class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-bold transition-all">
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('shopForm').addEventListener('submit', handleShopSubmit);
  } catch (error) {
    showNotification('حدث خطأ في تحميل المحلات', 'error');
  }
};

const showAddShopModal = () => {
  document.getElementById('shopModal').classList.remove('hidden');
  document.getElementById('shopForm').reset();
};

const closeShopModal = () => {
  document.getElementById('shopModal').classList.add('hidden');
};

const handleShopSubmit = async (e) => {
  e.preventDefault();
  
  const data = {
    username: document.getElementById('shop_username').value,
    password: document.getElementById('shop_password').value,
    name: document.getElementById('shop_name').value,
    phone: document.getElementById('shop_phone').value,
    address: document.getElementById('shop_address').value
  };
  
  try {
    await API.request('/shops', {
      method: 'POST',
      data
    });
    showNotification('تم إنشاء حساب المحل بنجاح');
    closeShopModal();
    renderShopsManagement();
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

const toggleShopStatus = async (id, status) => {
  try {
    await API.request(`/shops/${id}/status`, {
      method: 'PUT',
      data: { status }
    });
    showNotification(status === 'active' ? 'تم تفعيل المحل' : 'تم تعطيل المحل');
    renderShopsManagement();
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

// ============== Orders Management ==============
const renderOrdersManagement = async () => {
  try {
    const orders = await API.request('/orders?role=admin');
    
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="bg-white rounded-xl shadow-lg p-6">
        <h2 class="text-2xl font-bold text-gray-800 mb-6">
          <i class="fas fa-shopping-cart ml-2"></i>
          إدارة الحجوزات
        </h2>
        
        <!-- Filter Tabs -->
        <div class="flex space-x-2 space-x-reverse mb-6 border-b">
          <button onclick="filterOrders('all')" class="order-filter px-4 py-2 font-semibold border-b-2 border-green-600 text-green-700" data-filter="all">
            الكل (${orders.length})
          </button>
          <button onclick="filterOrders('pending')" class="order-filter px-4 py-2 font-semibold border-b-2 border-transparent text-gray-600 hover:text-green-700" data-filter="pending">
            قيد الانتظار (${orders.filter(o => o.status === 'pending').length})
          </button>
          <button onclick="filterOrders('confirmed')" class="order-filter px-4 py-2 font-semibold border-b-2 border-transparent text-gray-600 hover:text-green-700" data-filter="confirmed">
            مؤكدة (${orders.filter(o => o.status === 'confirmed').length})
          </button>
          <button onclick="filterOrders('cancelled')" class="order-filter px-4 py-2 font-semibold border-b-2 border-transparent text-gray-600 hover:text-green-700" data-filter="cancelled">
            ملغاة (${orders.filter(o => o.status === 'cancelled').length})
          </button>
        </div>
        
        <div id="orders-list">
          ${renderOrdersList(orders)}
        </div>
      </div>
      
      <!-- Order Details Modal -->
      <div id="orderDetailsModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">تفاصيل الحجز</h3>
              <button onclick="closeOrderDetailsModal()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>
            <div id="orderDetailsContent"></div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showNotification('حدث خطأ في تحميل الحجوزات', 'error');
  }
};

const renderOrdersList = (orders) => {
  if (orders.length === 0) {
    return '<p class="text-gray-500 text-center py-8">لا توجد حجوزات</p>';
  }
  
  return `
    <div class="space-y-4">
      ${orders.map(order => `
        <div class="border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-all">
          <div class="flex justify-between items-start mb-4">
            <div>
              <h3 class="text-xl font-bold text-gray-800">حجز #${order.id}</h3>
              <p class="text-gray-600">
                <i class="fas fa-store ml-1"></i>
                ${order.shop_name}
              </p>
              <p class="text-gray-500 text-sm">${formatDate(order.created_at)}</p>
            </div>
            <span class="px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}">
              ${getStatusText(order.status)}
            </span>
          </div>
          
          <div class="flex justify-between items-center mb-4">
            <div>
              <p class="text-gray-600">المبلغ الإجمالي:</p>
              <p class="text-2xl font-bold text-green-600">${formatCurrency(order.total_amount)}</p>
            </div>
          </div>
          
          ${order.notes ? `<p class="text-gray-600 text-sm mb-4"><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
          
          <div class="flex space-x-2 space-x-reverse">
            <button onclick="viewOrderDetails(${order.id})" class="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all">
              <i class="fas fa-eye ml-1"></i>
              عرض التفاصيل
            </button>
            ${order.status === 'pending' ? `
              <button onclick="updateOrderStatus(${order.id}, 'confirmed')" class="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all">
                <i class="fas fa-check ml-1"></i>
                تأكيد
              </button>
              <button onclick="updateOrderStatus(${order.id}, 'cancelled')" class="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all">
                <i class="fas fa-times ml-1"></i>
                إلغاء
              </button>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

let allOrders = [];

const filterOrders = async (status) => {
  // Update active filter
  document.querySelectorAll('.order-filter').forEach(btn => {
    if (btn.dataset.filter === status) {
      btn.classList.add('border-green-600', 'text-green-700');
      btn.classList.remove('border-transparent', 'text-gray-600');
    } else {
      btn.classList.remove('border-green-600', 'text-green-700');
      btn.classList.add('border-transparent', 'text-gray-600');
    }
  });
  
  try {
    const orders = await API.request('/orders?role=admin');
    allOrders = orders;
    
    const filtered = status === 'all' ? orders : orders.filter(o => o.status === status);
    document.getElementById('orders-list').innerHTML = renderOrdersList(filtered);
  } catch (error) {
    showNotification('حدث خطأ في تحميل الحجوزات', 'error');
  }
};

const viewOrderDetails = async (orderId) => {
  try {
    const order = await API.request(`/orders/${orderId}`);
    
    document.getElementById('orderDetailsContent').innerHTML = `
      <div class="space-y-6">
        <!-- Order Info -->
        <div class="bg-gray-50 rounded-xl p-5">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-gray-600 text-sm">رقم الحجز</p>
              <p class="font-bold text-lg">#${order.id}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm">الحالة</p>
              <span class="px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}">
                ${getStatusText(order.status)}
              </span>
            </div>
            <div>
              <p class="text-gray-600 text-sm">اسم المحل</p>
              <p class="font-semibold">${order.shop_name}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm">رقم الهاتف</p>
              <p class="font-semibold">${order.shop_phone || '-'}</p>
            </div>
            <div class="col-span-2">
              <p class="text-gray-600 text-sm">العنوان</p>
              <p class="font-semibold">${order.shop_address || '-'}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm">تاريخ الحجز</p>
              <p class="font-semibold">${formatDate(order.created_at)}</p>
            </div>
            <div>
              <p class="text-gray-600 text-sm">المبلغ الإجمالي</p>
              <p class="font-bold text-xl text-green-600">${formatCurrency(order.total_amount)}</p>
            </div>
          </div>
          ${order.notes ? `
            <div class="mt-4">
              <p class="text-gray-600 text-sm">ملاحظات</p>
              <p class="font-semibold">${order.notes}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Order Items -->
        <div>
          <h4 class="text-lg font-bold text-gray-800 mb-4">عناصر الحجز</h4>
          <div class="overflow-x-auto">
            <table class="w-full">
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
        
        ${order.receipt_url ? `
          <div>
            <h4 class="text-lg font-bold text-gray-800 mb-2">إيصال الدفع</h4>
            <p class="text-blue-600">${order.receipt_url}</p>
          </div>
        ` : ''}
      </div>
    `;
    
    document.getElementById('orderDetailsModal').classList.remove('hidden');
  } catch (error) {
    showNotification('حدث خطأ في تحميل تفاصيل الحجز', 'error');
  }
};

const closeOrderDetailsModal = () => {
  document.getElementById('orderDetailsModal').classList.add('hidden');
};

const updateOrderStatus = async (orderId, status) => {
  const confirmMsg = status === 'confirmed' ? 'هل تريد تأكيد هذا الحجز؟' : 'هل تريد إلغاء هذا الحجز؟';
  if (!confirm(confirmMsg)) return;
  
  try {
    await API.request(`/orders/${orderId}/status`, {
      method: 'PUT',
      data: { status }
    });
    showNotification('تم تحديث حالة الحجز بنجاح');
    renderOrdersManagement();
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

// ============== Sales Reports ==============
const renderSalesReports = async () => {
  try {
    const salesData = await API.request('/stats/sales');
    
    const content = document.getElementById('admin-content');
    content.innerHTML = `
      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h2 class="text-2xl font-bold text-gray-800 mb-6">
            <i class="fas fa-chart-bar ml-2"></i>
            تقارير المبيعات
          </h2>
          
          <div class="bg-gray-50 rounded-xl p-6">
            <canvas id="salesChart" height="100"></canvas>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-lg p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4">المبيعات حسب المنتج</h3>
          <div class="overflow-x-auto">
            <table class="w-full">
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
    
    // Render chart
    const ctx = document.getElementById('salesChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: salesData.map(item => item.product_name),
        datasets: [{
          label: 'المبيعات (ر.ع)',
          data: salesData.map(item => item.total_sales),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                family: 'Segoe UI'
              }
            }
          },
          title: {
            display: true,
            text: 'مبيعات المنتجات',
            font: {
              size: 18,
              family: 'Segoe UI'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toFixed(3) + ' ر.ع';
              }
            }
          }
        }
      }
    });
  } catch (error) {
    showNotification('حدث خطأ في تحميل التقارير', 'error');
  }
};

// ============== Shop Dashboard ==============
const renderShopDashboard = async () => {
  try {
    const products = await API.request('/products?status=available');
    
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
        <!-- Header -->
        <header class="bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg sticky top-0 z-40">
          <div class="container mx-auto px-4 py-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-4 space-x-reverse">
                <div class="bg-white bg-opacity-20 p-3 rounded-full">
                  <i class="fas fa-store text-2xl"></i>
                </div>
                <div>
                  <h1 class="text-2xl font-bold">متجر الخضروات</h1>
                  <p class="text-green-100 text-sm">${currentUser.name}</p>
                </div>
              </div>
              <div class="flex items-center space-x-4 space-x-reverse">
                <button onclick="showCart()" class="relative bg-white bg-opacity-20 hover:bg-opacity-30 p-3 rounded-full transition-all">
                  <i class="fas fa-shopping-cart text-xl"></i>
                  ${cart.length > 0 ? `<span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">${cart.length}</span>` : ''}
                </button>
                <button onclick="logout()" class="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-all">
                  <i class="fas fa-sign-out-alt ml-2"></i>
                  خروج
                </button>
              </div>
            </div>
          </div>
        </header>

        <!-- Navigation Tabs -->
        <div class="bg-white shadow-md">
          <div class="container mx-auto px-4">
            <div class="flex space-x-2 space-x-reverse">
              <button onclick="showShopTab('products')" class="shop-tab px-6 py-4 font-semibold border-b-4 border-green-600 text-green-700" data-tab="products">
                <i class="fas fa-leaf ml-2"></i>المنتجات المتاحة
              </button>
              <button onclick="showShopTab('orders')" class="shop-tab px-6 py-4 font-semibold border-b-4 border-transparent text-gray-600 hover:text-green-700" data-tab="orders">
                <i class="fas fa-list ml-2"></i>حجوزاتي
              </button>
            </div>
          </div>
        </div>

        <!-- Content -->
        <div class="container mx-auto px-4 py-8">
          <div id="shop-content">
            <div class="mb-6">
              <h2 class="text-3xl font-bold text-gray-800 mb-2">المنتجات المتاحة</h2>
              <p class="text-gray-600">اختر المنتجات وأضفها للسلة</p>
            </div>
            
            <div id="products-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              ${products.map(product => `
                <div class="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all overflow-hidden">
                  <div class="bg-gradient-to-br from-green-400 to-green-600 h-32 flex items-center justify-center">
                    <i class="fas fa-leaf text-white text-5xl"></i>
                  </div>
                  
                  <div class="p-5">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">${product.name_ar}</h3>
                    ${product.name_en ? `<p class="text-gray-600 text-sm mb-3">${product.name_en}</p>` : ''}
                    ${product.description ? `<p class="text-gray-600 text-sm mb-4">${product.description}</p>` : ''}
                    
                    <div class="space-y-3 mb-4">
                      <div class="flex justify-between items-center">
                        <span class="text-gray-600 font-semibold">السعر:</span>
                        <span class="text-2xl font-bold text-green-600">${formatCurrency(product.price)}</span>
                      </div>
                      <div class="flex justify-between items-center">
                        <span class="text-gray-600 font-semibold">المتوفر:</span>
                        <span class="font-bold ${product.quantity < 20 ? 'text-red-600' : 'text-gray-800'}">${product.quantity} ${product.unit}</span>
                      </div>
                    </div>
                    
                    <div class="flex items-center space-x-2 space-x-reverse mb-4">
                      <label class="text-gray-700 font-semibold whitespace-nowrap">الكمية:</label>
                      <input 
                        type="number" 
                        id="qty-${product.id}" 
                        min="1" 
                        max="${product.quantity}" 
                        value="1"
                        class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    
                    <button 
                      onclick="addToCart(${product.id}, '${product.name_ar}', ${product.price}, '${product.unit}', ${product.quantity})"
                      class="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-lg font-bold transition-all shadow-lg"
                      ${product.quantity === 0 ? 'disabled' : ''}
                    >
                      <i class="fas fa-cart-plus ml-2"></i>
                      ${product.quantity === 0 ? 'نفذت الكمية' : 'أضف للسلة'}
                    </button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Cart Modal -->
        <div id="cartModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div class="p-6">
              <div class="flex justify-between items-center mb-6">
                <h3 class="text-2xl font-bold text-gray-800">
                  <i class="fas fa-shopping-cart ml-2"></i>
                  سلة التسوق
                </h3>
                <button onclick="closeCart()" class="text-gray-500 hover:text-gray-700">
                  <i class="fas fa-times text-2xl"></i>
                </button>
              </div>
              <div id="cartContent"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showNotification('حدث خطأ في تحميل المنتجات', 'error');
  }
};

const showShopTab = (tab) => {
  // Update active tab
  document.querySelectorAll('.shop-tab').forEach(btn => {
    if (btn.dataset.tab === tab) {
      btn.classList.add('border-green-600', 'text-green-700');
      btn.classList.remove('border-transparent', 'text-gray-600');
    } else {
      btn.classList.remove('border-green-600', 'text-green-700');
      btn.classList.add('border-transparent', 'text-gray-600');
    }
  });
  
  // Load content
  if (tab === 'products') {
    renderShopDashboard();
  } else if (tab === 'orders') {
    renderShopOrders();
  }
};

const addToCart = (productId, name, price, unit, maxQty) => {
  const qtyInput = document.getElementById(`qty-${productId}`);
  const quantity = parseInt(qtyInput.value);
  
  if (quantity <= 0 || quantity > maxQty) {
    showNotification('الكمية المطلوبة غير صحيحة', 'error');
    return;
  }
  
  const existingItem = cart.find(item => item.product_id === productId);
  if (existingItem) {
    existingItem.quantity = quantity;
  } else {
    cart.push({
      product_id: productId,
      name,
      price,
      unit,
      quantity
    });
  }
  
  showNotification(`تمت إضافة ${name} للسلة`);
  qtyInput.value = 1;
};

const showCart = () => {
  if (cart.length === 0) {
    document.getElementById('cartContent').innerHTML = `
      <div class="text-center py-12">
        <i class="fas fa-shopping-cart text-gray-300 text-6xl mb-4"></i>
        <p class="text-gray-500 text-lg">السلة فارغة</p>
      </div>
    `;
  } else {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    document.getElementById('cartContent').innerHTML = `
      <div class="space-y-4 mb-6">
        ${cart.map((item, index) => `
          <div class="flex items-center justify-between border border-gray-200 rounded-xl p-4">
            <div class="flex-1">
              <h4 class="font-bold text-lg">${item.name}</h4>
              <p class="text-gray-600">${formatCurrency(item.price)} × ${item.quantity} ${item.unit}</p>
            </div>
            <div class="flex items-center space-x-4 space-x-reverse">
              <p class="font-bold text-xl text-green-600">${formatCurrency(item.price * item.quantity)}</p>
              <button onclick="removeFromCart(${index})" class="text-red-600 hover:text-red-700">
                <i class="fas fa-trash"></i>
              </button>
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
      
      <div class="flex space-x-2 space-x-reverse">
        <button onclick="confirmOrder()" class="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold transition-all">
          <i class="fas fa-check ml-2"></i>
          تأكيد الحجز
        </button>
        <button onclick="cart = []; closeCart();" class="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-all">
          <i class="fas fa-trash ml-2"></i>
          إفراغ السلة
        </button>
      </div>
    `;
  }
  
  document.getElementById('cartModal').classList.remove('hidden');
};

const closeCart = () => {
  document.getElementById('cartModal').classList.add('hidden');
};

const removeFromCart = (index) => {
  cart.splice(index, 1);
  showCart();
  if (cart.length === 0) {
    renderShopDashboard();
  }
};

const confirmOrder = async () => {
  if (cart.length === 0) return;
  
  const notes = document.getElementById('orderNotes').value;
  
  try {
    const result = await API.request('/orders', {
      method: 'POST',
      data: {
        shop_id: currentUser.id,
        items: cart,
        notes
      }
    });
    
    showNotification('تم إنشاء الحجز بنجاح');
    cart = [];
    closeCart();
    renderShopDashboard();
  } catch (error) {
    showNotification(error.message, 'error');
  }
};

const renderShopOrders = async () => {
  try {
    const orders = await API.request(`/orders?userId=${currentUser.id}&role=shop`);
    
    const content = document.getElementById('shop-content');
    content.innerHTML = `
      <div class="space-y-6">
        <div class="mb-6">
          <h2 class="text-3xl font-bold text-gray-800 mb-2">حجوزاتي</h2>
          <p class="text-gray-600">عرض وإدارة حجوزاتك</p>
        </div>
        
        ${orders.length === 0 ? `
          <div class="bg-white rounded-xl shadow-lg p-12 text-center">
            <i class="fas fa-shopping-bag text-gray-300 text-6xl mb-4"></i>
            <p class="text-gray-500 text-lg">لا توجد حجوزات بعد</p>
          </div>
        ` : `
          <div class="space-y-4">
            ${orders.map(order => `
              <div class="bg-white rounded-xl shadow-lg p-6">
                <div class="flex justify-between items-start mb-4">
                  <div>
                    <h3 class="text-2xl font-bold text-gray-800">حجز #${order.id}</h3>
                    <p class="text-gray-500 text-sm">${formatDate(order.created_at)}</p>
                  </div>
                  <span class="px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}">
                    ${getStatusText(order.status)}
                  </span>
                </div>
                
                <div class="mb-4">
                  <p class="text-gray-600">المبلغ الإجمالي:</p>
                  <p class="text-3xl font-bold text-green-600">${formatCurrency(order.total_amount)}</p>
                </div>
                
                ${order.notes ? `<p class="text-gray-600 text-sm mb-4"><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
                
                <button onclick="viewOrderDetails(${order.id})" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all">
                  <i class="fas fa-eye ml-2"></i>
                  عرض التفاصيل
                </button>
              </div>
            `).join('')}
          </div>
        `}
      </div>
      
      <!-- Order Details Modal (reuse admin modal) -->
      <div id="orderDetailsModal" class="hidden fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div class="p-6">
            <div class="flex justify-between items-center mb-6">
              <h3 class="text-2xl font-bold text-gray-800">تفاصيل الحجز</h3>
              <button onclick="closeOrderDetailsModal()" class="text-gray-500 hover:text-gray-700">
                <i class="fas fa-times text-2xl"></i>
              </button>
            </div>
            <div id="orderDetailsContent"></div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    showNotification('حدث خطأ في تحميل الحجوزات', 'error');
  }
};

// Helper functions
const getStatusColor = (status) => {
  switch(status) {
    case 'pending': return 'bg-yellow-100 text-yellow-700';
    case 'confirmed': return 'bg-green-100 text-green-700';
    case 'cancelled': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusText = (status) => {
  switch(status) {
    case 'pending': return 'قيد الانتظار';
    case 'confirmed': return 'مؤكد';
    case 'cancelled': return 'ملغي';
    default: return status;
  }
};

// Initialize app
if (checkAuth()) {
  if (currentUser.role === 'admin') {
    renderAdminDashboard();
  } else {
    renderShopDashboard();
  }
} else {
  renderLoginPage();
}

// Make functions global
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
window.filterOrders = filterOrders;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderDetailsModal = closeOrderDetailsModal;
window.updateOrderStatus = updateOrderStatus;
window.addToCart = addToCart;
window.showCart = showCart;
window.closeCart = closeCart;
window.removeFromCart = removeFromCart;
window.confirmOrder = confirmOrder;
