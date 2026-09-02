# VAYORA – Direct Agricultural Marketplace & AI Intelligence
**Smart India Hackathon 2026 (SIH26033)**

> **Problem Statement (SIH26033):** Multiple intermediaries reduce farmers' earnings and increase consumer prices.  
> **Solution:** A farmer-centric direct agricultural marketplace connecting Farmers & FPOs directly with Verified Bulk Buyers through Gemini AI indicative pricing, multi-supplier bulk aggregation, and QR/OTP tamper-proof delivery verification.

---

## 🌟 Key Innovations & Value Proposition

1. **Gemini AI Indicative Price Intelligence & Demand Forecasting:**
   - Real-time indicative price bounds (₹XX - ₹YY/kg) calculated via Google Gemini 1.5 & APMC Mandi benchmark models.
   - 7-day wholesale demand projection curves for urban consumer clusters.
2. **Multi-Supplier Bulk Order Matching (Signature SIH Innovation):**
   - When a buyer requires 1,000 kg and no single farmer has enough stock, VAYORA’s matching engine dynamically splits the order across multiple nearby FPOs and farmers (e.g. FPO A 500kg + Farmer B 300kg + FPO C 200kg) into a consolidated transport route saving ~₹1,750 in freight.
3. **100% Transparent Direct Price Breakdown:**
   - Every transaction shows: Produce Amount + Fair Logistics + Nominal Platform Fee = Total Buyer Payable.
   - **Zero hidden broker commissions or middleman markups.** Farmer receives 100% of the agreed produce value.
4. **Tamper-Proof Dual QR Code + 6-Digit OTP Delivery Verification:**
   - Handover between driver and buyer requires cryptographic QR scan or 6-digit OTP verification.
   - Automatically marks order as `DELIVERED` and instantly releases escrow payment to the farmer.
5. **Zero-Config Resilient Demo Architecture:**
   - Complete offline & live fallback modes for Gemini AI, OpenRouteService, Firebase Auth, and Payments so the app never fails during live judging.
   - Floating **SIH Demo Role Switcher** with 1-click persona switching.

---

## 🏗️ Architecture & Tech Stack

```
Frontend (React 19 + Vite + TypeScript + Tailwind CSS + Lucide React + Leaflet OSM)
         │
         ├── Firebase Authentication (Phone OTP)
         ├── Cloud Firestore Database
         ├── Firebase Storage
         │
         └── Cloud Functions Backend
                   ├── Gemini AI Indicative Price Engine
                   ├── Multi-Supplier Bulk Matcher Algorithm
                   ├── OpenRouteService Highway Optimization
                   ├── Sandbox Payment & Escrow Service
                   └── Tamper-Proof QR/OTP Delivery Verifier
```

---

## 👥 5 Role-Protected Dashboards

| Role | Persona | Key Features |
|---|---|---|
| **FARMER** | Ramesh Patil (Nashik) | List produce, AI Indicative Pricing, 7-Day Demand Chart, Buyer Offers, Farm Gate Pickup Pass |
| **FPO** | Sahyadri Agro Federation (1,200+ Farmers) | Bulk produce listing, member aggregation, collective logistics |
| **BUYER** | Metro Fresh Supermarkets (Mumbai) | Filtered Marketplace, Smart Bulk Matcher, Transparent Checkout, Delivery QR Pass |
| **LOGISTICS** | Kisan Express Agri-Logistics | Highway Route Optimization, Leaflet OSM tracking, QR Camera Scanner & OTP verifier |
| **ADMIN** | VAYORA Directorate | KYC User Verification queue, Platform GMV Ledger, Recharts Analytics |

---

## 🚀 17-Step SIH Hackathon Demo Walkthrough

1. **Farmer Experience:**
   - Switch persona to **Farmer (Ramesh)** using the bottom Demo Switcher.
   - Click **"+ List Produce"** -> Enter 300 kg Grade A Tomatoes -> View instant Gemini AI recommended range (₹32–₹34/kg) with High Demand analysis.
   - Submit listing to make it live on the marketplace.
2. **Buyer Discovery & Bulk Matching:**
   - Switch persona to **Buyer (Metro Fresh)** -> Open **Marketplace**.
   - View Ramesh's verified tomatoes and nearby alternative seller comparison.
   - Open **Smart Bulk Matcher** -> Request 1,000 kg Tomatoes -> System algorithmically aggregates Sahyadri FPO (500kg) + Farmer Ramesh (300kg) + Godavari FPO (200kg) with combined logistics savings.
3. **Transparent Checkout & Escrow Payment:**
   - Click **"Proceed to Combined Checkout"** -> View 100% transparent fee breakdown (Produce + Logistics + ₹100 platform fee; 0% broker fee).
   - Complete test sandbox payment -> Order ID generated with Escrow Lock.
4. **Logistics & Live Route Tracking:**
   - Switch persona to **Logistics (Kisan Express)** -> View assigned route on OpenStreetMap with OpenRouteService optimization.
   - Step through dispatch: Mark Picked Up ➔ Mark In-Transit.
5. **QR/OTP Verified Handover & Escrow Release:**
   - Open **Delivery Verification** -> Click "⚡ 1-Click Simulate Verified Handover" or scan Buyer QR.
   - Confetti animation triggers: Status becomes `DELIVERED` and payment is released to farmer.
6. **Admin Oversight:**
   - Switch persona to **Admin** -> Verify real-time GMV transaction volume, category charts, and user verification ledger.

---

## 💻 Quick Start & Run Instructions

```bash
# 1. Install dependencies
npm install

# 2. Start local development server
npm run dev

# 3. Build for production
npm run build
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
