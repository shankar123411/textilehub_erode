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

let memoryCategories = [
  { id: 1, name: 'Silk & Soft Sarees', code: 'CAT-S' },
  { id: 2, name: 'Linen & Cotton Shirtings', code: 'CAT-SH' },
  { id: 3, name: 'Tailoring & Stitching Work', code: 'CAT-ST' },
  { id: 4, name: 'Nighties & Home', code: 'CAT-N' },
  { id: 5, name: 'Uniforms', code: 'CAT-UN' }
];

let memoryProducts = [
  // CATEGORY 1: SILK & SOFT SAREES (5 Authentic Products)
  {
    id: 1, uuid: 'p01', code: 'TX-S01',
    name: 'Pure Zari Soft Silk Saree (Erode Special)',
    description: 'Traditional South Indian Weave with Rich Contrast Pallu & Running Blouse',
    fabric_type: 'Soft Silk', gsm_count: '80s Count',
    available_colors: 'Maroon, Royal Blue, Bottle Green, Mustard Gold',
    price: 1850.00, price_type: 'per_piece',
    category_name: 'Silk & Soft Sarees', category_id: 1,
    image_url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 2, uuid: 'p02', code: 'TX-S02',
    name: 'Kanchipuram Bridal Silk Saree (Pure Copper Zari)',
    description: 'Heavy Brocade Bridal Silk with Grand Temple Border & Gold Motif Buttas',
    fabric_type: 'Pure Mulberry Silk', gsm_count: '120s Silk Weave',
    available_colors: 'Crimson Red, Rani Pink, Emerald Green, Golden Yellow',
    price: 3450.00, price_type: 'per_piece',
    category_name: 'Silk & Soft Sarees', category_id: 1,
    image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 3, uuid: 'p03', code: 'TX-S03',
    name: 'Bhavani Jacquard Soft Silk Saree',
    description: 'Featherlight Partywear Jacquard Body with Silver Floral Vines & Rich Tassels',
    fabric_type: 'Art Silk Jacquard', gsm_count: '70s Count',
    available_colors: 'Peacock Blue, Pastel Lavender, Coral Peach, Teal',
    price: 1450.00, price_type: 'per_piece',
    category_name: 'Silk & Soft Sarees', category_id: 1,
    image_url: 'https://images.unsplash.com/photo-1610030469668-932d56a3378d?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 4, uuid: 'p04', code: 'TX-S04',
    name: 'Elampillai Traditional Soft Silk-Cotton Saree',
    description: 'Comfort Daily Pooja & Function Wear with Thread Work Border & Contrast Pallu',
    fabric_type: 'Silk Cotton Blend', gsm_count: '80x80 Count',
    available_colors: 'Mango Yellow, Dark Violet, Copper Brown, Navy Blue',
    price: 980.00, price_type: 'per_piece',
    category_name: 'Silk & Soft Sarees', category_id: 1,
    image_url: 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 5, uuid: 'p05', code: 'TX-S05',
    name: 'Semi-Tussar Digital Print Silk Saree',
    description: 'Contemporary Kalamkari & Geometric Digital Prints with Antique Zari Edge',
    fabric_type: 'Semi Tussar Silk', gsm_count: '90 GSM',
    available_colors: 'Beige Cream, Rust Orange, Olive Grey, Maroon',
    price: 1250.00, price_type: 'per_piece',
    category_name: 'Silk & Soft Sarees', category_id: 1,
    image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },

  // CATEGORY 2: LINEN & COTTON SHIRTINGS (5 Authentic Products)
  {
    id: 6, uuid: 'p06', code: 'TX-SH01',
    name: 'Premium Pure Linen 60s Count Shirting',
    description: '100% Breathable European Flax Linen Fabric for Luxury Formal & Casual Shirts',
    fabric_type: 'Pure Flax Linen', gsm_count: '60s Lea Count',
    available_colors: 'White, Sky Blue, Pastel Pink, Natural Olive',
    price: 380.00, price_type: 'per_meter',
    category_name: 'Linen & Cotton Shirtings', category_id: 2,
    image_url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 7, uuid: 'p07', code: 'TX-SH02',
    name: '100% Giza Cotton Satin Shirting Fabric',
    description: 'Silky Smooth Egyptian Giza Long-Staple Cotton for Premium Executive Wear',
    fabric_type: '100% Giza Cotton', gsm_count: '80s Double Ply',
    available_colors: 'Classic White, Light Grey, Royal Navy, Mint Green',
    price: 290.00, price_type: 'per_meter',
    category_name: 'Linen & Cotton Shirtings', category_id: 2,
    image_url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 8, uuid: 'p08', code: 'TX-SH03',
    name: 'Erode Handloom Slub Khadi Cotton Fabric',
    description: 'Authentic Textured Handloom Khadi Cotton with High Breathability & Durability',
    fabric_type: 'Handloom Slub Cotton', gsm_count: '160 GSM',
    available_colors: 'Indigo Blue, Khaki Brown, Off-White, Charcoal',
    price: 195.00, price_type: 'per_meter',
    category_name: 'Linen & Cotton Shirtings', category_id: 2,
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 9, uuid: 'p09', code: 'TX-SH04',
    name: 'Yarn-Dyed Melange Check Cotton Fabric',
    description: 'Wrinkle-resistant Micro Check Weave for Everyday Office & Casual Shirts',
    fabric_type: 'Poly-Cotton Blend', gsm_count: '50s Combed Yarn',
    available_colors: 'Navy-Red Check, Blue-White Micro, Green Check',
    price: 175.00, price_type: 'per_meter',
    category_name: 'Linen & Cotton Shirtings', category_id: 2,
    image_url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 10, uuid: 'p10', code: 'TX-SH05',
    name: 'Indigo Dobby Structure Shirting Fabric',
    description: 'Rich Indigo Dobby Textured Weave with Natural Color Retention',
    fabric_type: '100% Combed Cotton', gsm_count: '145 GSM',
    available_colors: 'Dark Indigo, Washed Denim Blue, Sky Dobby',
    price: 240.00, price_type: 'per_meter',
    category_name: 'Linen & Cotton Shirtings', category_id: 2,
    image_url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },

  // CATEGORY 3: TAILORING & STITCHING WORK (5 Authentic Services)
  {
    id: 11, uuid: 'p11', code: 'TX-ST01',
    name: 'Double-Needle Executive Formal Shirt Stitching',
    description: 'Precision Machine Cut Collar, French Placket & Interlock Double Stitching',
    fabric_type: 'Garment Stitching', gsm_count: 'Master Tailor Cut',
    available_colors: 'Slim Fit / Regular Fit',
    price: 280.00, price_type: 'per_stitching',
    category_name: 'Tailoring & Stitching Work', category_id: 3,
    image_url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 12, uuid: 'p12', code: 'TX-ST02',
    name: 'Custom Formal Trouser / Pant Tailoring Work',
    description: 'Cross Pocket, Waistband Canvas Grip & Heavy Hem Finishing for Men',
    fabric_type: 'Trouser Stitching', gsm_count: 'Commercial Grade',
    available_colors: 'Custom Waist & Length',
    price: 320.00, price_type: 'per_stitching',
    category_name: 'Tailoring & Stitching Work', category_id: 3,
    image_url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 13, uuid: 'p13', code: 'TX-ST03',
    name: 'School & Industrial Uniform Bulk Stitching (Per Set)',
    description: 'Bulk Production Job Work for Schools, Colleges & Industrial Factories',
    fabric_type: 'Bulk Job Work', gsm_count: 'Industrial 5-Thread',
    available_colors: 'Any Standard Uniform',
    price: 180.00, price_type: 'per_stitching',
    category_name: 'Tailoring & Stitching Work', category_id: 3,
    image_url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 14, uuid: 'p14', code: 'TX-ST04',
    name: 'Bridal Blouse Aari Embroidery & Maggam Work',
    description: 'Handcrafted Zardozi, Kundan Beads & Thread Embroidery Designer Blouse',
    fabric_type: 'Hand Embroidery & Stitch', gsm_count: 'Artisan Work',
    available_colors: 'Matching Saree Fabric',
    price: 1200.00, price_type: 'per_stitching',
    category_name: 'Tailoring & Stitching Work', category_id: 3,
    image_url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 15, uuid: 'p15', code: 'TX-ST05',
    name: 'Ladies Kurti & Salwar Suit Custom Tailoring',
    description: 'Designer Neck Pattern, Piping Finish & Overlock Lining Stitch for Women',
    fabric_type: 'Women Tailoring', gsm_count: 'Overlock Seam',
    available_colors: 'Custom Body Measurement',
    price: 350.00, price_type: 'per_stitching',
    category_name: 'Tailoring & Stitching Work', category_id: 3,
    image_url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },

  // CATEGORY 4: NIGHTIES & HOME (5 Authentic Products)
  {
    id: 16, uuid: 'p16', code: 'TX-N01',
    name: 'Pure Erode 100% Cotton Printed Nighty',
    description: 'Soft breathable daily wear printed cotton nighty with guaranteed fast colors',
    fabric_type: '100% Pure Cotton', gsm_count: '140 GSM',
    available_colors: 'Floral Pink, Cyan, Violet, Maroon',
    price: 290.00, price_type: 'per_piece',
    category_name: 'Nighties & Home', category_id: 4,
    image_url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 17, uuid: 'p17', code: 'TX-N02',
    name: 'Maternity & Feeding Zip Cotton Nighty',
    description: 'Concealed Dual Vertical Zips for Easy Nursing, Extra Flare & Deep Pockets',
    fabric_type: 'Super Combed Cotton', gsm_count: '150 GSM',
    available_colors: 'Teal Blue, Mustard, Berry Pink, Indigo',
    price: 350.00, price_type: 'per_piece',
    category_name: 'Nighties & Home', category_id: 4,
    image_url: 'https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 18, uuid: 'p18', code: 'TX-N03',
    name: 'Heavy Cotton Double Bedspread (90x100 inch)',
    description: 'Traditional Erode Jacquard Woven Double Bedsheet with 2 Pillow Covers',
    fabric_type: '100% Woven Cotton', gsm_count: '240 GSM Heavy',
    available_colors: 'Blue Paisley, Maroon Floral, Geometric Gold',
    price: 580.00, price_type: 'per_piece',
    category_name: 'Nighties & Home', category_id: 4,
    image_url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 19, uuid: 'p19', code: 'TX-N04',
    name: 'Bhavani Jamakkalam Pure Cotton Floor Carpet',
    description: 'Famous Bhavani Striped Handloom Jamakkalam Carpet for Home & Functions',
    fabric_type: 'Heavy Handloom Cotton', gsm_count: '400 GSM Floor Weave',
    available_colors: 'Multi-Color Stripes (Red, Green, Yellow)',
    price: 420.00, price_type: 'per_piece',
    category_name: 'Nighties & Home', category_id: 4,
    image_url: 'https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 20, uuid: 'p20', code: 'TX-N05',
    name: '450 GSM Terry Cotton Luxury Bath Towel (Pack of 3)',
    description: 'Ultra Absorbent Combed Terry Cotton Bath Towels with Fast Dry Loops',
    fabric_type: '100% Terry Cotton', gsm_count: '450 GSM Terry',
    available_colors: 'Royal Blue, White, Coffee Brown',
    price: 390.00, price_type: 'per_piece',
    category_name: 'Nighties & Home', category_id: 4,
    image_url: 'https://images.unsplash.com/photo-1616627547584-bf28cee262db?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },

  // CATEGORY 5: UNIFORMS (5 Authentic Products)
  {
    id: 21, uuid: 'p21', code: 'TX-UN01',
    name: 'School Uniform Fabric Combo (Shirt + Pant)',
    description: 'Heavy Duty Yarn-dyed Poly Cotton Suiting & Shirting Uniform Sets',
    fabric_type: 'Poly Cotton Heavy', gsm_count: '220 GSM Suiting',
    available_colors: 'Navy Blue & White, Khaki, Maroon Check',
    price: 480.00, price_type: 'per_piece',
    category_name: 'Uniforms', category_id: 5,
    image_url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 22, uuid: 'p22', code: 'TX-UN02',
    name: 'Industrial Heavy Drill Boiler Suit / Coverall',
    description: 'Fire-retardant Cotton Drill Coverall with Reflective Safety Tape & Brass Zip',
    fabric_type: '100% Cotton Drill', gsm_count: '260 GSM Heavy Drill',
    available_colors: 'Navy Blue, Safety Orange, Petrol Green',
    price: 750.00, price_type: 'per_piece',
    category_name: 'Uniforms', category_id: 5,
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 23, uuid: 'p23', code: 'TX-UN03',
    name: 'Hospital Medical Doctor & Nurse Scrubs Set',
    description: 'Antimicrobial Treated Breathable Scrub Top & Cargo Pant for Healthcare Staff',
    fabric_type: 'Poly-Viscose Spandex', gsm_count: '180 GSM Stretch',
    available_colors: 'Medical Teal, Sky Blue, Navy Blue, Wine Red',
    price: 620.00, price_type: 'per_piece',
    category_name: 'Uniforms', category_id: 5,
    image_url: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 24, uuid: 'p24', code: 'TX-UN04',
    name: 'Security Guard Safari Suit Uniform Set',
    description: 'Stiff-collar Safari Uniform with Epaulettes, Double Pockets & Badge Loop',
    fabric_type: 'Matty Poly-Viscose', gsm_count: '240 GSM Heavy',
    available_colors: 'Z-Black, Dark Navy, Khaki, Light Brown',
    price: 690.00, price_type: 'per_piece',
    category_name: 'Uniforms', category_id: 5,
    image_url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  },
  {
    id: 25, uuid: 'p25', code: 'TX-UN05',
    name: 'Hotel Chef Coat & Kitchen Executive Apron Set',
    description: 'Double-breasted Heat Resistant Chef Jacket with Cloth Knot Buttons & Apron',
    fabric_type: 'Mercerized Cotton Twill', gsm_count: '210 GSM',
    available_colors: 'Crisp White with Black Piping, Solid Black',
    price: 540.00, price_type: 'per_piece',
    category_name: 'Uniforms', category_id: 5,
    image_url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&auto=format&fit=crop&q=80',
    is_available: 1
  }
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
        (4, 1, 'Nighties & Home', 'CAT-N'),
        (5, 1, 'Uniforms', 'CAT-UN')
      ON CONFLICT DO NOTHING;
    `);
    console.log('PostgreSQL database seeded for TextileHub Erode!');
  } catch (err) {
    console.error('PG Init Warning:', err.message);
  }
}

// -------------------------------------------------------------
// PWA MANIFEST, SERVICE WORKER & EXPLICIT LOGO ROUTES
// -------------------------------------------------------------
app.get('/icons/logo.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'icons', 'logo.png'));
});
app.get('/icons/icon-192.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'icons', 'icon-192.png'));
});
app.get('/icons/icon-512.png', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'icons', 'icon-512.png'));
});

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
    const [dbCategories] = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    const [products] = await pool.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status = 'active'
      ORDER BY p.id ASC
    `);

    const [jobs] = await pool.query('SELECT * FROM job_orders ORDER BY id DESC');

    const catList = (dbCategories && dbCategories.length > 0) ? dbCategories : memoryCategories;
    const itemList = (products && products.length > 0) ? products : memoryProducts;
    const jobList = (jobs && jobs.length > 0) ? jobs : Array.from(memoryJobs.values());

    const activeJobsCount = jobList.filter(j => j.status !== 'dispatched').length;
    const readyJobsCount = jobList.filter(j => j.status === 'dispatched').length;

    res.render('catalog', {
      products: itemList,
      jobs: jobList,
      categories: catList,
      activeJobsCount,
      readyJobsCount,
      merchant: {
        company_name: 'TextileHub Erode',
        whatsapp: '916374428155',
        city: 'Erode, Tamil Nadu'
      }
    });
  } catch (err) {
    const jobList = Array.from(memoryJobs.values());
    const activeJobsCount = jobList.filter(j => j.status !== 'dispatched').length;
    const readyJobsCount = jobList.filter(j => j.status === 'dispatched').length;

    res.render('catalog', {
      products: memoryProducts,
      jobs: jobList,
      categories: memoryCategories,
      activeJobsCount,
      readyJobsCount,
      merchant: { company_name: 'TextileHub Erode', whatsapp: '916374428155', city: 'Erode' }
    });
  }
});

app.get('/track', (req, res) => res.redirect('/#trackerView'));
app.get('/admin', (req, res) => res.redirect('/#adminView'));
app.get('/admin/login', (req, res) => res.redirect('/#adminView'));

// -------------------------------------------------------------
// CATEGORIES API
// -------------------------------------------------------------
app.get('/api/v1/categories', async (req, res) => {
  try {
    const [dbCategories] = await pool.query('SELECT * FROM categories ORDER BY id ASC');
    const catList = (dbCategories && dbCategories.length > 0) ? dbCategories : memoryCategories;
    res.json({ categories: catList });
  } catch (err) {
    res.json({ categories: memoryCategories });
  }
});

app.post('/api/v1/admin/categories', async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const cleanName = String(name).trim();
    const cleanCode = code ? String(code).trim().toUpperCase() : ('CAT-' + cleanName.slice(0, 3).toUpperCase());
    const newId = memoryCategories.length > 0 ? Math.max(...memoryCategories.map(c => c.id)) + 1 : 1;

    const newCat = {
      id: newId,
      name: cleanName,
      code: cleanCode
    };

    memoryCategories.push(newCat);

    try {
      await pool.query("INSERT INTO categories (id, merchant_id, name, code) VALUES (?, 1, ?, ?)", [newId, cleanName, cleanCode]);
    } catch(e) {}

    res.json({ message: 'Category added successfully', category: newCat });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

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

    const catId = parseInt(category_id || 1);
    const matchedCat = memoryCategories.find(c => c.id === catId);
    const categoryName = matchedCat ? matchedCat.name : 'Silk & Soft Sarees';

    const newProd = {
      id: Date.now(),
      uuid: productUuid,
      code,
      name,
      description: description || 'High quality Erode textile collection',
      fabric_type: fabric_type || 'Cotton / Silk',
      gsm_count: gsm_count || '120 GSM',
      available_colors: available_colors || 'Multiple Colors',
      price: parseFloat(price) || 0,
      price_type: price_type || 'per_piece',
      category_name: categoryName,
      category_id: catId,
      image_url: image_url || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600&auto=format&fit=crop&q=80',
      is_available: 1
    };

    memoryProducts.unshift(newProd);

    try {
      await pool.query(
        "INSERT INTO products (uuid, merchant_id, category_id, code, name, description, fabric_type, gsm_count, available_colors, price, price_type, image_url, is_available, status, created_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'active', NOW())",
        [productUuid, catId, code, name, description || null, fabric_type, gsm_count, available_colors, price, price_type, image_url]
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

    res.json({ message: 'Stitching Job Order created', ticketNumber, job: newJob });
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
