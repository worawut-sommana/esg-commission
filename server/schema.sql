CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS months (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  billing TEXT NOT NULL DEFAULT '-',
  deduct NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brands (
  id BIGSERIAL PRIMARY KEY,
  month_id UUID NOT NULL REFERENCES months(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  units INTEGER NOT NULL DEFAULT 0,
  value NUMERIC NOT NULL DEFAULT 0,
  com1 NUMERIC NOT NULL DEFAULT 0,
  chunk2 NUMERIC NOT NULL DEFAULT 0,
  reg_diff NUMERIC NOT NULL DEFAULT 0,
  source_filename TEXT,
  source_file BYTEA,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kept for databases created before these columns existed; harmless on fresh installs.
ALTER TABLE brands ADD COLUMN IF NOT EXISTS source_filename TEXT;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS source_file BYTEA;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS records (
  id BIGSERIAL PRIMARY KEY,
  month_id UUID NOT NULL REFERENCES months(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  vin TEXT NOT NULL DEFAULT '',
  financier TEXT NOT NULL DEFAULT '',
  delivery_date TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  com NUMERIC NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_brands_month ON brands(month_id);
CREATE INDEX IF NOT EXISTS idx_records_month ON records(month_id);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session store used by connect-pg-simple (express-session).
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR NOT NULL COLLATE "default" PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- Single-row table holding the external eaksahalink API connection details.
-- The api_key is never sent back to the browser after it's saved.
CREATE TABLE IF NOT EXISTS integration_settings (
  id INT PRIMARY KEY DEFAULT 1,
  api_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_settings_single_row CHECK (id = 1)
);

-- Local cache of vehicle sales data pulled from the eaksahalink external API.
-- contno (the source system's sales contract number) is the natural unique key,
-- so saving overlapping date ranges again updates existing rows instead of duplicating them.
CREATE TABLE IF NOT EXISTS external_sales (
  id BIGSERIAL PRIMARY KEY,
  contno TEXT NOT NULL UNIQUE,
  sale_type TEXT NOT NULL DEFAULT '',
  locat TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  sale_condition TEXT NOT NULL DEFAULT '',
  delivery_date TIMESTAMPTZ,
  chassis_no TEXT NOT NULL DEFAULT '',
  sale_price NUMERIC NOT NULL DEFAULT 0,
  wholesales NUMERIC NOT NULL DEFAULT 0,
  model_code TEXT NOT NULL DEFAULT '',
  msrp NUMERIC NOT NULL DEFAULT 0,
  sdate TIMESTAMPTZ,
  taxno TEXT NOT NULL DEFAULT '',
  taxdt TIMESTAMPTZ,
  resvno TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  registration_paid BOOLEAN NOT NULL DEFAULT false,
  registration_payment_count INTEGER NOT NULL DEFAULT 0,
  registration_total_paid NUMERIC,
  registration_last_paid_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_external_sales_brand ON external_sales(brand);
CREATE INDEX IF NOT EXISTS idx_external_sales_delivery_date ON external_sales(delivery_date);

-- Maps the free-text sale_condition values returned by the external API
-- (full legal bank/leasing names, e.g. "ธนาคารกรุงศรีอยุธยา จำกัด(มหาชน)")
-- to the short financier codes used in uploaded Excel records (e.g. "AYCAL").
CREATE TABLE IF NOT EXISTS financier_mapping (
  id BIGSERIAL PRIMARY KEY,
  external_value TEXT NOT NULL UNIQUE,
  financier TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Master data of registration fees per brand/model/year, entered manually
-- (see "Master DATA ค่าจดทะเบียนแต่ละรุ่น"). ส่วนต่าง is derived as
-- customer_fee - registration_fee rather than stored.
CREATE TABLE IF NOT EXISTS vehicle_registrations (
  id BIGSERIAL PRIMARY KEY,
  brand TEXT NOT NULL DEFAULT '',
  import_type TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  weight NUMERIC NOT NULL DEFAULT 0,
  registration_fee NUMERIC NOT NULL DEFAULT 0,
  customer_fee NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Column added after the initial release; keeps existing databases in sync
-- since the CREATE TABLE above is a no-op once the table already exists.
ALTER TABLE vehicle_registrations ADD COLUMN IF NOT EXISTS weight NUMERIC NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_vehicle_registrations_brand ON vehicle_registrations(brand);
