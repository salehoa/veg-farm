import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', serveStatic({ root: './public' }))

// ============== Helper Functions ==============

// Hash password (simple for demo - use bcrypt in production)
const hashPassword = (password: string) => password

// Check password
const checkPassword = (password: string, hash: string) => password === hash

// Initialize database
async function initDB(db: D1Database) {
  try {
    // Check if tables exist
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
    ).first()
    
    if (!result) {
      console.log('Database not initialized. Please run migrations.')
    }
  } catch (error) {
    console.error('Database error:', error)
  }
}

// ============== Authentication APIs ==============

// Login
app.post('/api/auth/login', async (c) => {
  try {
    const { username, password } = await c.req.json()
    
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE username = ? AND status = "active"'
    ).bind(username).first()

    if (!user || !checkPassword(password, user.password as string)) {
      return c.json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' }, 401)
    }

    // Return user data without password
    const { password: _, ...userData } = user
    return c.json({ 
      success: true,
      user: userData
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في تسجيل الدخول' }, 500)
  }
})

// ============== Products APIs ==============

// Get all products
app.get('/api/products', async (c) => {
  try {
    const status = c.req.query('status')
    let query = 'SELECT * FROM products'
    
    if (status) {
      query += ' WHERE status = ?'
      const { results } = await c.env.DB.prepare(query).bind(status).all()
      return c.json(results)
    }
    
    const { results } = await c.env.DB.prepare(query).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب المنتجات' }, 500)
  }
})

// Get single product
app.get('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const product = await c.env.DB.prepare(
      'SELECT * FROM products WHERE id = ?'
    ).bind(id).first()

    if (!product) {
      return c.json({ error: 'المنتج غير موجود' }, 404)
    }

    return c.json(product)
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب المنتج' }, 500)
  }
})

// Create product (admin only)
app.post('/api/products', async (c) => {
  try {
    const { name_ar, name_en, description, price, unit, quantity, image_url } = await c.req.json()
    
    const result = await c.env.DB.prepare(
      `INSERT INTO products (name_ar, name_en, description, price, unit, quantity, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'available')`
    ).bind(name_ar, name_en || '', description || '', price, unit || 'كرتون', quantity, image_url || '').run()

    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'تم إضافة المنتج بنجاح'
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في إضافة المنتج' }, 500)
  }
})

// Update product (admin only)
app.put('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { name_ar, name_en, description, price, unit, quantity, image_url, status } = await c.req.json()
    
    await c.env.DB.prepare(
      `UPDATE products 
       SET name_ar = ?, name_en = ?, description = ?, price = ?, unit = ?, 
           quantity = ?, image_url = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(name_ar, name_en, description, price, unit, quantity, image_url, status, id).run()

    return c.json({ 
      success: true,
      message: 'تم تحديث المنتج بنجاح'
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في تحديث المنتج' }, 500)
  }
})

// Delete product (admin only)
app.delete('/api/products/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    await c.env.DB.prepare(
      'DELETE FROM products WHERE id = ?'
    ).bind(id).run()

    return c.json({ 
      success: true,
      message: 'تم حذف المنتج بنجاح'
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في حذف المنتج' }, 500)
  }
})

// ============== Shop/Users Management APIs ==============

// Get all shops (admin only)
app.get('/api/shops', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, username, name, phone, address, status, created_at FROM users WHERE role = "shop" ORDER BY created_at DESC'
    ).all()

    return c.json(results)
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب المحلات' }, 500)
  }
})

// Create shop account (admin only)
app.post('/api/shops', async (c) => {
  try {
    const { username, password, name, phone, address } = await c.req.json()
    
    // Check if username exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE username = ?'
    ).bind(username).first()

    if (existing) {
      return c.json({ error: 'اسم المستخدم موجود بالفعل' }, 400)
    }

    const result = await c.env.DB.prepare(
      `INSERT INTO users (username, password, name, role, phone, address, status)
       VALUES (?, ?, ?, 'shop', ?, ?, 'active')`
    ).bind(username, hashPassword(password), name, phone || '', address || '').run()

    return c.json({ 
      success: true, 
      id: result.meta.last_row_id,
      message: 'تم إنشاء حساب المحل بنجاح'
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في إنشاء حساب المحل' }, 500)
  }
})

// Update shop status (admin only)
app.put('/api/shops/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()
    
    await c.env.DB.prepare(
      'UPDATE users SET status = ? WHERE id = ? AND role = "shop"'
    ).bind(status, id).run()

    return c.json({ 
      success: true,
      message: status === 'active' ? 'تم تفعيل المحل' : 'تم تعطيل المحل'
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في تحديث حالة المحل' }, 500)
  }
})

// ============== Orders APIs ==============

// Get all orders (admin can see all, shop sees only their orders)
app.get('/api/orders', async (c) => {
  try {
    const userId = c.req.query('userId')
    const role = c.req.query('role')
    const status = c.req.query('status')
    
    let query = `
      SELECT o.*, u.name as shop_name, u.phone as shop_phone
      FROM orders o
      JOIN users u ON o.shop_id = u.id
    `
    
    const conditions = []
    const params = []
    
    if (role === 'shop' && userId) {
      conditions.push('o.shop_id = ?')
      params.push(userId)
    }
    
    if (status) {
      conditions.push('o.status = ?')
      params.push(status)
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ')
    }
    
    query += ' ORDER BY o.created_at DESC'
    
    const { results } = await c.env.DB.prepare(query).bind(...params).all()
    return c.json(results)
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب الحجوزات' }, 500)
  }
})

// Get order details with items
app.get('/api/orders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    
    const order = await c.env.DB.prepare(
      `SELECT o.*, u.name as shop_name, u.phone as shop_phone, u.address as shop_address
       FROM orders o
       JOIN users u ON o.shop_id = u.id
       WHERE o.id = ?`
    ).bind(id).first()

    if (!order) {
      return c.json({ error: 'الحجز غير موجود' }, 404)
    }

    const { results: items } = await c.env.DB.prepare(
      'SELECT * FROM order_items WHERE order_id = ?'
    ).bind(id).all()

    return c.json({
      ...order,
      items
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب تفاصيل الحجز' }, 500)
  }
})

// Create order
app.post('/api/orders', async (c) => {
  try {
    const { shop_id, items, notes } = await c.req.json()
    
    // Calculate total and validate stock
    let total_amount = 0
    const validatedItems = []
    
    for (const item of items) {
      const product = await c.env.DB.prepare(
        'SELECT * FROM products WHERE id = ? AND status = "available"'
      ).bind(item.product_id).first()

      if (!product) {
        return c.json({ error: `المنتج غير متوفر` }, 400)
      }

      if ((product.quantity as number) < item.quantity) {
        return c.json({ 
          error: `الكمية المطلوبة من ${product.name_ar} غير متوفرة. المتوفر: ${product.quantity}` 
        }, 400)
      }

      const itemTotal = (product.price as number) * item.quantity
      total_amount += itemTotal
      
      validatedItems.push({
        product_id: item.product_id,
        product_name: product.name_ar,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal
      })
    }

    // Create order
    const orderResult = await c.env.DB.prepare(
      `INSERT INTO orders (shop_id, total_amount, status, notes)
       VALUES (?, ?, 'pending', ?)`
    ).bind(shop_id, total_amount, notes || '').run()

    const orderId = orderResult.meta.last_row_id

    // Insert order items and update product quantities
    for (const item of validatedItems) {
      await c.env.DB.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(orderId, item.product_id, item.product_name, item.quantity, item.price, item.total).run()

      // Decrease product quantity
      await c.env.DB.prepare(
        'UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
      ).bind(item.quantity, item.product_id).run()
    }

    return c.json({ 
      success: true, 
      order_id: orderId,
      message: 'تم إنشاء الحجز بنجاح'
    })
  } catch (error) {
    console.error('Order creation error:', error)
    return c.json({ error: 'حدث خطأ في إنشاء الحجز' }, 500)
  }
})

// Update order status (admin only)
app.put('/api/orders/:id/status', async (c) => {
  try {
    const id = c.req.param('id')
    const { status } = await c.req.json()
    
    // If cancelling order, return products to stock
    if (status === 'cancelled') {
      const { results: items } = await c.env.DB.prepare(
        'SELECT product_id, quantity FROM order_items WHERE order_id = ?'
      ).bind(id).all()

      for (const item of items) {
        await c.env.DB.prepare(
          'UPDATE products SET quantity = quantity + ? WHERE id = ?'
        ).bind(item.quantity, item.product_id).run()
      }
    }
    
    await c.env.DB.prepare(
      'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(status, id).run()

    return c.json({ 
      success: true,
      message: 'تم تحديث حالة الحجز'
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في تحديث حالة الحجز' }, 500)
  }
})

// Update order receipt
app.put('/api/orders/:id/receipt', async (c) => {
  try {
    const id = c.req.param('id')
    const { receipt_url } = await c.req.json()
    
    await c.env.DB.prepare(
      'UPDATE orders SET receipt_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(receipt_url, id).run()

    return c.json({ 
      success: true,
      message: 'تم رفع الإيصال بنجاح'
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في رفع الإيصال' }, 500)
  }
})

// ============== Statistics APIs ==============

// Get dashboard statistics
app.get('/api/stats/dashboard', async (c) => {
  try {
    // Total products
    const productsCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM products'
    ).first()

    // Total shops
    const shopsCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role = "shop"'
    ).first()

    // Total orders
    const ordersCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM orders'
    ).first()

    // Pending orders
    const pendingOrders = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM orders WHERE status = "pending"'
    ).first()

    // Total sales
    const totalSales = await c.env.DB.prepare(
      'SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "cancelled"'
    ).first()

    // Low stock products
    const lowStock = await c.env.DB.prepare(
      'SELECT * FROM products WHERE quantity < 20 AND status = "available" ORDER BY quantity ASC'
    ).all()

    return c.json({
      products: productsCount?.count || 0,
      shops: shopsCount?.count || 0,
      orders: ordersCount?.count || 0,
      pendingOrders: pendingOrders?.count || 0,
      totalSales: totalSales?.total || 0,
      lowStock: lowStock.results || []
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب الإحصائيات' }, 500)
  }
})

// Get sales statistics
app.get('/api/stats/sales', async (c) => {
  try {
    // Sales by product
    const salesByProduct = await c.env.DB.prepare(
      `SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total) as total_sales,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY oi.product_name
      ORDER BY total_sales DESC`
    ).all()

    return c.json(salesByProduct.results || [])
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب إحصائيات المبيعات' }, 500)
  }
})

// ============== Main Route ==============

app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>نظام إدارة مزرعة الخضروات</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
        </style>
    </head>
    <body class="bg-gradient-to-br from-green-50 to-green-100 min-h-screen">
        <div id="app"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
