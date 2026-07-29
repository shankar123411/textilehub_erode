# 🧶 TextileHub Erode - Textile Catalog & Stitching Job Work Tracker

> **Project:** Erode Textile & Garment Digital Catalog, 1-Click WhatsApp Ordering & Live Tailoring Job Work Progress Tracker  
> **Tech Stack:** Node.js, Express.js, PostgreSQL Cloud, EJS, PWA (Progressive Web App), Vanilla CSS3  
> **Local Demo URL:** `http://localhost:4000`  

---

## 🌟 Key Features

1. 👗 **Digital Product & Fabric Catalog:** Browse Sarees, Shirtings, Garments, Nighties, and Uniforms with GSM count, colors, and wholesale prices.
2. 💬 **1-Click WhatsApp Order Generator:** Buyers can order directly on the merchant's WhatsApp with auto-formatted messages.
3. 🧵 **Stitching & Garment Job Work Tracker (`/track`):** Live 5-stage progress pipeline (`Inward Received` ➔ `Cutting ✂️` ➔ `Stitching 🧵` ➔ `Quality Check 🔍` ➔ `Dispatched 🚚`).
4. 📲 **PWA Mobile App Download:** Customers and merchants can install the application directly onto Android & iOS home screens.
5. 👑 **Merchant Control Panel (`/admin`):** Add new designs, manage inventory, issue stitching tickets, and update job progress.

---

## ⚙️ How to Run Locally

```bash
git clone <repository-url>
cd textilehub_erode
npm install
node server.js
```

Open browser at `http://localhost:4000`
- **Catalog View:** `http://localhost:4000`
- **Job Tracker:** `http://localhost:4000/track`
- **Merchant Admin:** `http://localhost:4000/admin` *(Username: `admin` | Password: `canteenapp`)*
