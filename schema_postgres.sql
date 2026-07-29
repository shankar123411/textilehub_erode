-- =============================================================
-- TEXTILEHUB ERODE - POSTGRESQL DATABASE SCHEMA
-- Enterprise Textile & Garment Production, WhatsApp Ordering, & Job Work Tracker
-- =============================================================

CREATE TABLE IF NOT EXISTS merchants (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE NOT NULL,
    company_name VARCHAR(150) NOT NULL,
    owner_name VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    whatsapp_number VARCHAR(20) NOT NULL,
    city VARCHAR(50) DEFAULT 'Erode',
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    merchant_id INT REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE NOT NULL,
    merchant_id INT REFERENCES merchants(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    fabric_type VARCHAR(100),
    gsm_count VARCHAR(50),
    available_colors TEXT,
    price NUMERIC(10, 2) NOT NULL,
    price_type VARCHAR(30) DEFAULT 'per_piece', -- per_piece / per_meter / per_stitching
    image_url TEXT,
    is_available INT DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_orders (
    id SERIAL PRIMARY KEY,
    uuid VARCHAR(64) UNIQUE NOT NULL,
    merchant_id INT REFERENCES merchants(id) ON DELETE CASCADE,
    job_ticket_number VARCHAR(50) UNIQUE NOT NULL,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20) NOT NULL,
    garment_type VARCHAR(100) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    fabric_inward_length VARCHAR(50),
    special_instructions TEXT,
    status VARCHAR(50) DEFAULT 'inward_received', -- inward_received, cutting, stitching, quality_check, packing, dispatched
    estimated_delivery DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS job_status_logs (
    id SERIAL PRIMARY KEY,
    job_order_id INT REFERENCES job_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    note TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
