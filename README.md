# ValueMap SL — Sri Lanka Land Valuation Intelligence Platform

A modern, professional, map-based web application for recording, visualising, and analysing land valuations across Sri Lanka.

---

## Features

| Feature | Details |
|---|---|
| 🗺️ **Interactive Map** | Leaflet + OpenStreetMap, click-to-explore, property markers |
| 📍 **Price Intelligence** | Click any location → instant area stats (median, avg, min/max) |
| 📝 **Add/Edit Valuations** | Tabbed form with embedded map location picker |
| 📊 **Dashboard** | KPI cards, bar/pie charts, district rankings, recent records |
| 📈 **Analytics** | District price comparison, land type analysis, monthly trend |
| 📋 **Records Management** | Sortable/filterable table, archive, restore, delete |
| ⬇️ **Excel Export** | Export filtered records to .xlsx |
| ⬆️ **Excel Import** | Upload .xlsx with row-by-row validation & duplicate detection |
| 🔐 **Authentication** | Role-based access (Admin / Valuer / Viewer) |
| 🧮 **Auto-Calculation** | Price per perch calculated from value ÷ extent |
| 📐 **A-R-P Conversion** | Acres-Roods-Perches entry with automatic conversion |
| 💾 **Local Storage** | Works offline in demo mode; Supabase-ready architecture |

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Administrator | admin@valuemap.lk | valuemap2024 |
| Valuer | valuer@valuemap.lk | valuer2024 |
| Read-only Viewer | viewer@valuemap.lk | viewer2024 |

> ⚠️ All pre-loaded sample records are **fictional** and clearly marked as DEMO data.

---

## Local Setup

### Prerequisites

- Node.js 18+ (https://nodejs.org)
- npm (included with Node.js)

### Steps

```bash
# 1. Navigate to the project directory
cd path/to/ValueMap

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Project Structure

```
src/
├── components/
│   ├── AddEditValuationModal.tsx  # Add/Edit form with map picker
│   ├── ValuationDetailModal.tsx   # Full detail view
│   └── ImportModal.tsx            # Excel import with validation
├── constants/
│   └── index.ts                   # Sri Lanka geo data, price ranges
├── contexts/
│   ├── AuthContext.tsx            # Auth provider (swap with Supabase)
│   └── ToastContext.tsx           # Notification system
├── data/
│   └── demoRecords.ts             # 15 fictional Sri Lankan records
├── pages/
│   ├── LoginPage.tsx              # Glassmorphism login
│   ├── DashboardPage.tsx          # KPIs + charts
│   ├── MapPage.tsx                # Interactive Leaflet map
│   ├── RecordsPage.tsx            # Table + CRUD management
│   └── AnalyticsPage.tsx          # District/type comparisons
├── services/
│   └── db.ts                      # LocalStorage DB (Supabase-ready)
├── types/
│   └── index.ts                   # All TypeScript types
├── utils/
│   └── index.ts                   # Calculations, formatting, geo math
└── App.tsx                        # Router + sidebar layout
```

---

## Upgrading to Supabase (Production)

The app is architected so that `src/services/db.ts` is the **only file** you need to replace to connect to a real database.

### Steps

1. **Create a Supabase project** at https://supabase.com
2. **Run the SQL migrations** (see `supabase/migrations/` below)
3. **Create `.env`**:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. **Install Supabase client**:

```bash
npm install @supabase/supabase-js
```

5. Replace `src/services/db.ts` functions with Supabase queries.
6. Replace `src/contexts/AuthContext.tsx` with `supabase.auth.signIn/signOut`.

---

## Supabase Database Schema

```sql
-- Enable PostGIS for geographical queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Valuation Records
CREATE TABLE valuation_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_number TEXT NOT NULL,
  report_reference TEXT,
  title         TEXT NOT NULL,
  address       TEXT NOT NULL,
  province      TEXT NOT NULL,
  district      TEXT NOT NULL,
  divisional_secretariat TEXT,
  town          TEXT NOT NULL,
  coordinates   GEOGRAPHY(POINT, 4326) NOT NULL,
  extent_perches DECIMAL(12,4) NOT NULL,
  land_type     TEXT NOT NULL,
  road_access   TEXT NOT NULL,
  property_characteristics TEXT,
  valuation_date DATE NOT NULL,
  total_land_value BIGINT NOT NULL,
  price_per_perch DECIMAL(14,2) GENERATED ALWAYS AS (total_land_value::DECIMAL / extent_perches) STORED,
  valuer_name   TEXT,
  valuation_purpose TEXT,
  notes         TEXT,
  is_archived   BOOLEAN DEFAULT FALSE,
  is_demo_data  BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  created_by    UUID REFERENCES auth.users(id),
  updated_by    UUID REFERENCES auth.users(id)
);

-- Index for geographical queries
CREATE INDEX idx_valuation_coords ON valuation_records USING GIST(coordinates);
CREATE INDEX idx_valuation_district ON valuation_records(district);
CREATE INDEX idx_valuation_date ON valuation_records(valuation_date);

-- Area statistics query (PostGIS)
-- SELECT * FROM valuation_records
-- WHERE ST_DWithin(
--   coordinates,
--   ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::GEOGRAPHY,
--   $radiusMetres
-- )
-- AND is_archived = FALSE;

-- Enable Row Level Security
ALTER TABLE valuation_records ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read
CREATE POLICY "authenticated_read" ON valuation_records
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: admins/valuers can write
CREATE POLICY "valuers_write" ON valuation_records
  FOR ALL USING (
    auth.jwt() ->> 'role' IN ('admin', 'valuer')
  );
```

---

## Deployment (Vercel)

```bash
# 1. Build production bundle
npm run build

# 2. Install Vercel CLI
npm install -g vercel

# 3. Deploy
vercel --prod
```

Set environment variables in the Vercel dashboard:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Data Accuracy Disclaimer

> This application is an **internal valuation intelligence tool**, not an official government land-price database.
> All statistics are calculated from recorded valuations only. Areas with fewer than 3 records display a warning.
> Do not treat displayed values as current market prices without independent verification.

---

## Excel Import Template

Download the template from the app (Records page → Import → Download Template).

Required columns:
```
referenceNumber | title | address | province | district | town
lat | lng | perches | landType | roadAccess | valuationDate | totalLandValue
```

Optional: `valuerName`, `notes`, `reportReference`

**Valid values:**
- `landType`: residential, commercial, agricultural, mixed-use, industrial
- `roadAccess`: main-road, secondary-road, gravel-road, no-road, lane
- `province`: Western, Central, Southern, Northern, Eastern, North Western, North Central, Uva, Sabaragamuwa

---

## Land Measurement Reference

| Unit | Perches |
|---|---|
| 1 Perch | 1 |
| 1 Rood | 40 perches |
| 1 Acre | 160 perches |

Formula: `Price per Perch = Total Land Value ÷ Total Extent in Perches`

---

## Backup & Recovery (Supabase)

```bash
# Backup
pg_dump "postgresql://postgres:[password]@[host]:5432/postgres" > backup.sql

# Restore
psql "postgresql://postgres:[password]@[host]:5432/postgres" < backup.sql
```

Supabase also provides automatic daily backups on paid plans.

---

## Future Mobile App

The backend is designed as a REST/GraphQL API through Supabase, making it straightforward to build a React Native mobile app that:
- Displays nearby valuations using GPS
- Adds valuations while visiting properties
- Uploads photos and documents
- Works offline with sync on reconnect

---

*© 2026 ValueMap SL — Internal Use Only*
