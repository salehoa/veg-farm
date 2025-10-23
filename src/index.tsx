import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

type Bindings = {
  DB: D1Database;
  R2: R2Bucket;
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
    const from = c.req.query('from')
    const to = c.req.query('to')
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
      'SELECT id, username, password, name, phone, address, status, created_at FROM users WHERE role = "shop" ORDER BY created_at DESC'
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

// Delete shop (admin only)
app.delete('/api/shops/:id', async (c) => {
  try {
    const id = c.req.param('id')
    // Check if shop has orders
    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as cnt FROM orders WHERE shop_id = ?'
    ).bind(id).first()

    if ((count?.cnt || 0) > 0) {
      return c.json({ error: 'لا يمكن حذف المحل لوجود حجوزات مرتبطة به. يُرجى إلغاء الحساب بدلًا من الحذف.' }, 400)
    }

    await c.env.DB.prepare(
      'DELETE FROM users WHERE id = ? AND role = "shop"'
    ).bind(id).run()

    return c.json({ success: true, message: 'تم حذف المحل بنجاح' })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في حذف المحل' }, 500)
  }
})

// Update shop (admin only) - username/password/name/phone/address/status
app.put('/api/shops/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const { username, password, name, phone, address, status } = await c.req.json()

    const sets: string[] = []
    const params: any[] = []

    if (username) {
      const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .bind(username, id).first()
      if (existing) return c.json({ error: 'اسم المستخدم موجود بالفعل' }, 400)
      sets.push('username = ?'); params.push(username)
    }
    if (password) { sets.push('password = ?'); params.push(hashPassword(password)) }
    if (name != null) { sets.push('name = ?'); params.push(name) }
    if (phone != null) { sets.push('phone = ?'); params.push(phone) }
    if (address != null) { sets.push('address = ?'); params.push(address) }
    if (status) { sets.push('status = ?'); params.push(status) }

    if (sets.length === 0) return c.json({ error: 'لا توجد بيانات للتحديث' }, 400)

    params.push(id)
    await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role = "shop"`).bind(...params).run()

    return c.json({ success: true, message: 'تم تحديث بيانات المحل بنجاح' })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في تحديث بيانات المحل' }, 500)
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
    const from = c.req.query('from')
    const to = c.req.query('to')
    
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
    
    if (from) {
      conditions.push('o.created_at >= ?')
      params.push(`${from} 00:00:00`)
    }
    if (to) {
      conditions.push('o.created_at <= ?')
      params.push(`${to} 23:59:59`)
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
    await c.env.DB.prepare('UPDATE orders SET receipt_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .bind(receipt_url, id).run()
    return c.json({ success: true, message: 'تم رفع الإيصال بنجاح' })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في رفع الإيصال' }, 500)
  }
})

// Delete order (admin)
app.delete('/api/orders/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const order = await c.env.DB.prepare('SELECT status FROM orders WHERE id = ?').bind(id).first()
    if (!order) return c.json({ error: 'الحجز غير موجود' }, 404)

    if (order.status !== 'cancelled') {
      const { results: items } = await c.env.DB.prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?').bind(id).all()
      for (const item of items as any[]) {
        await c.env.DB.prepare('UPDATE products SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
          .bind(item.quantity, item.product_id).run()
      }
    }

    await c.env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run()
    return c.json({ success: true, message: 'تم حذف الحجز بنجاح' })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في حذف الحجز' }, 500)
  }
})

// Export orders (admin)
app.get('/api/orders/export', async (c) => {
  try {
    const from = c.req.query('from')
    const to = c.req.query('to')
    const status = c.req.query('status')
    const format = (c.req.query('format') || 'csv').toLowerCase()

    const conditions: string[] = []
    const params: any[] = []
    if (from) { conditions.push('o.created_at >= ?'); params.push(`${from} 00:00:00`) }
    if (to) { conditions.push('o.created_at <= ?'); params.push(`${to} 23:59:59`) }
    if (status) { conditions.push('o.status = ?'); params.push(status) }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { results } = await c.env.DB.prepare(
      `SELECT 
        o.id as order_id,
        o.created_at,
        o.updated_at,
        o.status,
        o.total_amount,
        o.notes,
        o.receipt_url,
        u.id as shop_id,
        u.name as shop_name,
        u.username as shop_username,
        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.price,
        oi.total
       FROM orders o
       JOIN users u ON o.shop_id = u.id
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       ORDER BY o.created_at DESC, o.id DESC`
    ).bind(...params).all()

    if (format === 'json') {
      return c.json(results)
    }

    // CSV
    const header = [
      'order_id','created_at','updated_at','status','order_total','notes','receipt_url','shop_id','shop_name','shop_username','product_id','product_name','quantity','price','item_total'
    ]
    const lines = [header.join(',')]
    for (const r of results as any[]) {
      const row = [
        r.order_id, r.created_at, r.updated_at, r.status, r.total_amount, (r.notes||'').toString().replace(/\n/g,' '), (r.receipt_url||''), r.shop_id, (r.shop_name||''), (r.shop_username||''), r.product_id||'', (r.product_name||''), r.quantity||'', r.price||'', r.total||''
      ]
      lines.push(row.map(v => typeof v==='string' && v.includes(',') ? `"${v.replace(/"/g,'""')}"` : v).join(','))
    }
    const csv = lines.join('\n')
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="orders_export.csv"' } })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في تصدير البيانات' }, 500)
  }
})

// Import orders (admin)
app.post('/api/orders/import', async (c) => {
  try {
    const body = await c.req.json()
    const orders = body.orders as any[]
    if (!Array.isArray(orders)) return c.json({ error: 'صيغة الاستيراد غير صحيحة' }, 400)

    const created: number[] = []

    for (const o of orders) {
      // Resolve shop
      let shopId = o.shop_id
      if (!shopId && o.shop_username) {
        const shop = await c.env.DB.prepare('SELECT id FROM users WHERE username = ? AND role = "shop" AND status = "active"').bind(o.shop_username).first()
        if (!shop) return c.json({ error: `المحل ${o.shop_username} غير موجود` }, 400)
        shopId = shop.id
      }
      if (!shopId) return c.json({ error: 'shop_id أو shop_username مطلوب' }, 400)

      const status = o.status || 'pending'
      let total_amount = 0
      const itemsValidated: any[] = []
      if (!Array.isArray(o.items) || o.items.length === 0) return c.json({ error: 'يجب توفير عناصر الطلب' }, 400)

      for (const it of o.items) {
        const product = await c.env.DB.prepare('SELECT * FROM products WHERE id = ?')
          .bind(it.product_id).first()
        if (!product) return c.json({ error: `المنتج ${it.product_id} غير موجود` }, 400)

        const price = it.price != null ? it.price : (product.price as number)
        const quantity = it.quantity
        if (status !== 'cancelled' && (product.quantity as number) < quantity) {
          return c.json({ error: `الكمية المطلوبة من ${product.name_ar} غير متوفرة. المتوفر: ${product.quantity}` }, 400)
        }
        const lineTotal = price * quantity
        total_amount += lineTotal
        itemsValidated.push({ product_id: it.product_id, product_name: product.name_ar, quantity, price, total: lineTotal })
      }

      // Insert order (allow custom created_at)
      let insertOrderSql = 'INSERT INTO orders (shop_id, total_amount, status, notes, receipt_url'
      let valuesSql = ') VALUES (?, ?, ?, ?, ?'
      const params: any[] = [shopId, total_amount, status, o.notes || '', o.receipt_url || '']
      if (o.created_at) { insertOrderSql += ', created_at'; valuesSql += ', ?'; params.push(o.created_at) }
      insertOrderSql += valuesSql + ')'

      const orderResult = await c.env.DB.prepare(insertOrderSql).bind(...params).run()
      const orderId = orderResult.meta.last_row_id

      for (const it of itemsValidated) {
        await c.env.DB.prepare(
          'INSERT INTO order_items (order_id, product_id, product_name, quantity, price, total) VALUES (?, ?, ?, ?, ?, ?)'
        ).bind(orderId, it.product_id, it.product_name, it.quantity, it.price, it.total).run()

        if (status !== 'cancelled') {
          await c.env.DB.prepare('UPDATE products SET quantity = quantity - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .bind(it.quantity, it.product_id).run()
        }
      }

      created.push(orderId)
    }

    return c.json({ success: true, created })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في استيراد البيانات' }, 500)
  }
})

// ============== Users/Credentials APIs ==============

// Update username/password for a user
app.put('/api/users/:id/credentials', async (c) => {
  try {
    const id = c.req.param('id')
    const { username, password } = await c.req.json()

    if (!username && !password) return c.json({ error: 'لا توجد بيانات للتحديث' }, 400)

    if (username) {
      const existing = await c.env.DB.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .bind(username, id).first()
      if (existing) return c.json({ error: 'اسم المستخدم موجود بالفعل' }, 400)
    }

    const sets: string[] = []
    const params: any[] = []
    if (username) { sets.push('username = ?'); params.push(username) }
    if (password) { sets.push('password = ?'); params.push(hashPassword(password)) }
    params.push(id)

    await c.env.DB.prepare(`UPDATE users SET ${sets.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(...params).run()

    const user = await c.env.DB.prepare('SELECT id, username, name, role, phone, address, status, created_at FROM users WHERE id = ?')
      .bind(id).first()
    return c.json({ success: true, user })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في تحديث بيانات الحساب' }, 500)
  }
})

// ============== Upload APIs ==============

// Upload image to R2 and return a fetchable URL via proxy
app.post('/api/uploads', async (c) => {
  try {
    const form = await c.req.formData()
    const file = form.get('image')
    if (!file || typeof file === 'string') {
      return c.json({ error: 'الملف غير موجود' }, 400)
    }

    const f = file as File
    const arrayBuffer = await f.arrayBuffer()
    const contentType = f.type || 'application/octet-stream'
    const origName = (f as any).name || 'upload.bin'
    const ext = origName && origName.includes('.') ? origName.split('.').pop() : ''
    const key = `products/${new Date().toISOString().slice(0,10)}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext ? '.' + ext.toLowerCase() : ''}`

    await c.env.R2.put(key, arrayBuffer, { httpMetadata: { contentType } })

    // Build absolute URL for input type=url compatibility
    const origin = new URL(c.req.url).origin
    const path = `/api/uploads/${encodeURIComponent(key)}`
    const url = `${origin}${path}`
    return c.json({ success: true, key, path, url })
  } catch (error) {
    return c.json({ error: 'فشل رفع الصورة' }, 500)
  }
})

// Serve uploaded image from R2 by key (proxy)
app.get('/api/uploads/:key{.+}', async (c) => {
  try {
    const key = c.req.param('key')
    const object = await c.env.R2.get(key)
    if (!object) return c.json({ error: 'الملف غير موجود' }, 404)

    return new Response(object.body, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable'
      }
    })
  } catch (error) {
    return c.json({ error: 'حدث خطأ في جلب الملف' }, 500)
  }
})

// ============== Statistics APIs ==============

// Get dashboard statistics
app.get('/api/stats/dashboard', async (c) => {
  try {
    const from = c.req.query('from')
    const to = c.req.query('to')

    // Build date range conditions for orders-based aggregates
    const dateConds: string[] = []
    const dateParams: any[] = []
    if (from) {
      dateConds.push('created_at >= ?')
      dateParams.push(`${from} 00:00:00`)
    }
    if (to) {
      dateConds.push('created_at <= ?')
      dateParams.push(`${to} 23:59:59`)
    }
    const whereClause = dateConds.length ? `WHERE ${dateConds.join(' AND ')}` : ''
    const wherePending = dateConds.length ? `AND ${dateConds.join(' AND ')}` : ''

    // Total products (overall)
    const productsCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM products'
    ).first()

    // Total shops (overall)
    const shopsCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role = "shop"'
    ).first()

    // Total orders in range
    const ordersCount = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM orders ${whereClause}`
    ).bind(...dateParams).first()

    // Pending orders in range
    const pendingOrders = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM orders WHERE status = "pending" ${wherePending ? wherePending : ''}`
    ).bind(...dateParams).first()

    // Total sales in range
    const totalSales = await c.env.DB.prepare(
      `SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != "cancelled" ${wherePending ? wherePending : ''}`
    ).bind(...dateParams).first()

    // Low stock products (overall)
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
    const from = c.req.query('from')
    const to = c.req.query('to')

    const conditions: string[] = ["o.status != 'cancelled'"]
    const params: any[] = []
    if (from) {
      conditions.push('o.created_at >= ?')
      params.push(`${from} 00:00:00`)
    }
    if (to) {
      conditions.push('o.created_at <= ?')
      params.push(`${to} 23:59:59`)
    }

    const where = `WHERE ${conditions.join(' AND ')}`

    // Sales by product in range
    const salesByProduct = await c.env.DB.prepare(
      `SELECT 
        oi.product_name,
        SUM(oi.quantity) as total_quantity,
        SUM(oi.total) as total_sales,
        COUNT(DISTINCT oi.order_id) as order_count
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      ${where}
      GROUP BY oi.product_name
      ORDER BY total_sales DESC`
    ).bind(...params).all()

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
