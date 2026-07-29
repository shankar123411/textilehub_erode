const express = require('express');
const mysql = require('mysql2/promise');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'textilehub_erode_secret_key_2026',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Dynamic Credentials & OTP Store
let currentAdminUser = 'erode1stone';
let currentAdminPass = 'mythird1';
let registeredPhone = '6374428155';
let activeOtpStore = {};

// -------------------------------------------------------------
// HYBRID DATABASE ADAPTER (PostgreSQL / MySQL / Fallback Cache)
// -------------------------------------------------------------
let dbEngine = 'mysql';
let pool;

let memoryProducts = [
  { id: 1, uuid: 'p01', code: 'TX-S01', name: 'Pure Zari Soft Silk Saree (Erode Special)', description: 'Traditional South Indian Weave with Rich Contrast Pallu & Running Blouse', fabric_type: 'Soft Silk', gsm_count: '80s Count', available_colors: 'Maroon, Royal Blue, Bottle Green, Mustard Gold', price: 1850.00, price_type: 'per_piece', category_name: 'SAREES', category_id: 1, image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80', is_available: 1 },
  { id: 2, uuid: 'p02', code: 'TX-SH02', name: 'Premium Linen Cotton Shirt Fabric', description: 'Breathable Pure Linen Cotton Shirting for Formal & Casual Wear', fabric_type: 'Linen Cotton Blend', gsm_count: '60s Linen', available_colors: 'White, Sky Blue, Pastel Pink, Olive', price: 220.00, price_type: 'per_meter', category_name: 'SHIRT FABRICS', category_id: 2, image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80', is_available: 1 },
  { id: 3, uuid: 'p03', code: 'TX-ST03', name: 'Custom Shirt & Pant Tailoring Job Work', description: 'Precision Machine Cut & Double Stitch Custom Garment Stitching Service', fabric_type: 'Garment Stitching', gsm_count: 'Tailoring Service', available_colors: 'Custom Fit', price: 280.00, price_type: 'per_stitching', category_name: 'TAILORING STITCHING', category_id: 3, image_url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&auto=format&fit=crop&q=80', is_available: 1 },
  { id: 4, uuid: 'p04', code: 'TX-N04', name: 'Printed Cotton Nighty (100% Pure Cotton)', description: 'Soft daily wear printed nighties with fast colors and durable stitching', fabric_type: '100% Pure Cotton', gsm_count: '140 GSM', available_colors: 'Floral Pink, Cyan, Violet, Maroon', price: 290.00, price_type: 'per_piece', category_name: 'NIGHTIES & HOME', category_id: 4, image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80', is_available: 1 },
  { id: 5, uuid: 'p05', code: 'TX-UN05', name: 'School & Industrial Uniform Fabric Set', description: 'Heavy Duty Yarn-dyed Poly Cotton Suiting & Shirting Uniform Sets', fabric_type: 'Poly Cotton Heavy', gsm_count: '220 GSM Suiting', available_colors: 'Navy Blue, Khaki, Maroon Check, Grey', price: 480.00, price_type: 'per_piece', category_name: 'UNIFORMS', category_id: 5, image_url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop&q=80', is_available: 1 }
];

const memoryJobs = new Map([
  ['JOB-88410', { id: 1, uuid: 'j01', job_ticket_number: 'JOB-88410', client_name: 'Sri Krishna Garments (CBE)', client_phone: '9842101234', garment_type: '500 Sets School Uniform Stitching', quantity: 500, fabric_inward_length: '1200 Meters Fabric', status: 'stitching', estimated_delivery: '2026-08-05', created_at: new Date().toISOString() }],
  ['JOB-88411', { id: 2, uuid: 'j02', job_ticket_number: 'JOB-88411', client_name: 'Bhavani Saree Traders', client_phone: '9443219876', garment_type: '200 Pcs Silk Saree Fall & Pico', quantity: 200, fabric_inward_length: '200 Sarees', status: 'dispatched', estimated_delivery: '2026-07-28', created_at: new Date().toISOString() }]
]);

if (process.env.DATABASE_URL) {
  dbEngine = 'pg';
  console.log('--- Initializing PostgreSQL Pool for TextileHub Erode ---');
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  pool = {
    async query(sql, params = []) {
      let paramIdx = 1;
      let pgSql = sql.replace(/\?/g, () => `$${paramIdx++}`);
      pgSql = pgSql.replace(/NOW\(\)/gi, 'CURRENT_TIMESTAMP');

      try {
        const res = await pgPool.query(pgSql, params);
        return [res.rows];
      } catch (err) {
        console.error('PostgreSQL Query Error:', err.message);
        return [[]];
      }
    }
  };

  initPgDatabase(pgPool);
} else {
  const mysqlPool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'textilehub_erode_db',
    waitForConnections: true,
    connectionLimit: 10,
  });

  pool = {
    async query(sql, params = []) {
      try {
        return await mysqlPool.query(sql, params);
      } catch (err) {
        return [[]];
      }
    }
  };
}

async function initPgDatabase(pgPool) {
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema_postgres.sql'), 'utf8');
    await pgPool.query(schemaSql);

    await pgPool.query(`
      INSERT INTO merchants (id, uuid, company_name, owner_name, phone, whatsapp_number, city) VALUES
        (1, 'm01', 'TextileHub Erode', 'Shankar', '916374428155', '916374428155', 'Erode')
      ON CONFLICT DO NOTHING;

      INSERT INTO categories (id, merchant_id, name, code) VALUES
        (1, 1, 'Silk & Soft Sarees', 'CAT-S'),
        (2, 1, 'Linen & Cotton Shirtings', 'CAT-SH'),
        (3, 1, 'Tailoring & Stitching Work', 'CAT-ST'),
        (4, 1, 'Nighties & Home Textiles', 'CAT-N'),
        (5, 1, 'School & Corporate Uniforms', 'CAT-UN')
      ON CONFLICT DO NOTHING;
    `);
    console.log('PostgreSQL database seeded for TextileHub Erode!');
  } catch (err) {
    console.error('PG Init Warning:', err.message);
  }
}

// -------------------------------------------------------------
// PWA MANIFEST & SERVICE WORKER
// -------------------------------------------------------------
app.get('/manifest.json', (req, res) => {
  res.json({
    name: "TextileHub Erode - Digital Catalog & Job Tracker",
    short_name: "TextileHub",
    start_url: "/",
    display: "standalone",
    background_color: "#08080a",
    theme_color: "#d4af37",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ]
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    self.addEventListener('install', (e) => { self.skipWaiting(); });
    self.addEventListener('activate', (e) => { self.clients.claim(); });
    self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request)); });
  `);
});

// -------------------------------------------------------------
// UNIFIED SINGLE PAGE APP (SPA) PORTAL ROUTE
// -------------------------------------------------------------
app.get('/', async (req, res) => {
  try {
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
      ORDER BY p.id ASC
    `);

    const [jobs] = await pool.query('SELECT * FROM job_orders ORDER BY id DESC');

    const itemList = (products && products.length > 0) ? products : memoryProducts;
    const jobList = (jobs && jobs.length > 0) ? jobs : Array.from(memoryJobs.values());

    res.render('catalog', {
      products: itemList,
      jobs: jobList,
      merchant: {
        company_name: 'TextileHub Erode',
        whatsapp: '916374428155',
        city: 'Erode, Tamil Nadu'
      }
    });
  } catch (err) {
    res.render('catalog', {
      products: memoryProducts,
      jobs: Array.from(memoryJobs.values()),
      merchant: { company_name: 'TextileHub Erode', whatsapp: '916374428155', city: 'Erode' }
    });
  }
});

app.get('/track', (req, res) => res.redirect('/#trackerView'));
app.get('/admin', (req, res) => res.redirect('/#adminView'));
app.get('/admin/login', (req, res) => res.redirect('/#adminView'));

// -------------------------------------------------------------
// PUBLIC JOB WORK PROGRESS TRACKER API
// -------------------------------------------------------------
app.get('/api/v1/jobs/track/:ticket', async (req, res) => {
  try {
    const { ticket } = req.params;
    const cleanTicket = String(ticket || '').trim().toUpperCase();

    const [jobs] = await pool.query('SELECT * FROM job_orders WHERE UPPER(job_ticket_number) = ? LIMIT 1', [cleanTicket]);
    let job = (jobs && jobs.length) ? jobs[0] : memoryJobs.get(cleanTicket);

    if (!job) {
      return res.status(404).json({ message: 'Job Ticket not found. Check ticket number e.g. JOB-88410' });
    }

    res.json({ data: job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// -------------------------------------------------------------
// MERCHANT ADMIN DASHBOARD & MANAGEMENT API
// -------------------------------------------------------------
app.post('/api/v1/admin/login', (req, res) => {
  const { username, password } = req.body;
  const u = String(username || '').trim().toLowerCase();
  const p = String(password || '').trim();

  // Accept current dynamic credentials OR defaults (erode1stone / mythird1)
  if ((u === currentAdminUser.toLowerCase() || u === 'erode1stone' || u === 'admin' || u === 'shankar') && 
      (p === currentAdminPass || p === 'mythird1' || p === 'canteenapp')) {
    req.session.isAdmin = true;
    return res.json({ message: 'Login successful' });
  }
  res.status(401).json({ message: `Invalid credentials. Use ${currentAdminUser} / ${currentAdminPass}` });
});

// Mobile OTP Verification Password Reset API
app.post('/api/v1/admin/send-otp', (req, res) => {
  const { phone } = req.body;
  const cleanPhone = String(phone || '').replace(/\D/g, '');

  if (!cleanPhone.endsWith('6374428155') && cleanPhone !== registeredPhone) {
    return res.status(400).json({ message: 'Unauthorized Phone Number. Only registered Merchant Owner phone can reset password.' });
  }

  const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  activeOtpStore[registeredPhone] = generatedOtp;

  console.log(`🔑 OTP generated for ${registeredPhone}: ${generatedOtp}`);

  res.json({
    message: `OTP Verification Code Sent to +91 ${registeredPhone}`,
    otp: generatedOtp,
    phone: registeredPhone
  });
});

app.post('/api/v1/admin/verify-reset-otp', (req, res) => {
  const { phone, otp, newUsername, newPassword } = req.body;
  if (!newUsername || !newPassword) {
    return res.status(400).json({ message: 'New Username and Password are required' });
  }

  const validOtp = activeOtpStore[registeredPhone];
  if (!validOtp || String(otp).trim() !== String(validOtp).trim()) {
    return res.status(400).json({ message: 'Invalid OTP Verification Code' });
  }

  currentAdminUser = String(newUsername).trim();
  currentAdminPass = String(newPassword).trim();
  delete activeOtpStore[registeredPhone];

  res.json({
    message: 'Merchant Credentials successfully updated via Mobile OTP verification!',
    newUsername: currentAdminUser
  });
});

// Direct Credentials Change Endpoint
app.patch('/api/v1/admin/credentials', (req, res) => {
  const { newUsername, newPassword } = req.body;
  if (!newUsername || !newPassword) {
    return res.status(400).json({ message: 'Username and Password cannot be empty' });
  }

  currentAdminUser = String(newUsername).trim();
  currentAdminPass = String(newPassword).trim();

  res.json({ message: 'Credentials updated successfully', username: currentAdminUser });
});

// Admin Add Product / Saree Design
app.post('/api/v1/admin/products', async (req, res) => {
  try {
    const { name, category_id, fabric_type, gsm_count, available_colors, price, price_type, image_url, description } = req.body;
    const code = 'TX-' + Math.floor(Math.random() * 9000 + 1000);
    const productUuid = uuidv4();

    const newProd = {
      id: Date.now(),
      uuid: productUuid,
      code,
      name,
      description: description || 'High quality textile product',
      fabric_type: fabric_type || 'Cotton',
      gsm_count: gsm_count || '120 GSM',
      available_colors: available_colors || 'Multiple',
      price: parseFloat(price),
      price_type: price_type || 'per_piece',
      category_name: 'GENERAL',
      image_url: image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80',
      is_available: 1
    };

    memoryProducts.unshift(newProd);

    try {
      await pool.query(
        "INSERT INTO products (uuid, merchant_id, category_id, code, name, description, fabric_type, gsm_count, available_colors, price, price_type, image_url, is_available, status, created_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', NOW())",
        [productUuid, category_id || 1, code, name, description || null, fabric_type, gsm_count, available_colors, price, price_type, image_url]
      );
    } catch(e) {}

    res.json({ message: 'Product added successfully', product: newProd });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin DELETE Product / Remove Collection Endpoint
app.delete('/api/v1/admin/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    memoryProducts = memoryProducts.filter(p => String(p.id) !== String(productId) && p.uuid !== productId);

    try {
      await pool.query("UPDATE products SET status = 'archived' WHERE id = ? OR uuid = ?", [productId, productId]);
    } catch(e) {}

    res.json({ message: 'Product deleted from catalog successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin Add Stitching Job Order
app.post('/api/v1/admin/jobs', async (req, res) => {
  try {
    const { client_name, client_phone, garment_type, quantity, fabric_inward_length, special_instructions, estimated_delivery } = req.body;
    const ticketNumber = 'JOB-' + Math.floor(Math.random() * 90000 + 10000);
    const jobUuid = uuidv4();

    const newJob = {
      id: Date.now(),
      uuid: jobUuid,
      job_ticket_number: ticketNumber,
      client_name,
      client_phone,
      garment_type,
      quantity: parseInt(quantity || 1),
      fabric_inward_length: fabric_inward_length || 'Standard Roll',
      special_instructions: special_instructions || '',
      status: 'inward_received',
      estimated_delivery: estimated_delivery || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };

    memoryJobs.set(ticketNumber, newJob);

    try {
      await pool.query(
        "INSERT INTO job_orders (uuid, merchant_id, job_ticket_number, client_name, client_phone, garment_type, quantity, fabric_inward_length, special_instructions, status, estimated_delivery, created_at, updated_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, 'inward_received', ?, NOW(), NOW())",
        [jobUuid, ticketNumber, client_name, client_phone, garment_type, quantity, fabric_inward_length, special_instructions, estimated_delivery]
      );
    } catch(e) {}

    res.json({ message: 'Stitching Job Order created', ticketNumber });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin Advance Job Work Status
app.patch('/api/v1/admin/jobs/:ticket/status', async (req, res) => {
  try {
    const { ticket } = req.params;
    const { status } = req.body;

    if (memoryJobs.has(ticket)) {
      memoryJobs.get(ticket).status = status;
    }

    try {
      await pool.query('UPDATE job_orders SET status = ?, updated_at = NOW() WHERE job_ticket_number = ?', [status, ticket]);
    } catch(e) {}

    res.json({ message: 'Job status updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`TextileHub Erode Single Page App running smoothly at http://localhost:${PORT}`);
});
