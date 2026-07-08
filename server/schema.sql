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

-- Single-row table holding the external eaksahalink API connection details.
-- The api_key is never sent back to the browser after it's saved.
CREATE TABLE IF NOT EXISTS integration_settings (
  id INT PRIMARY KEY DEFAULT 1,
  api_url TEXT NOT NULL DEFAULT '',
  api_key TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT integration_settings_single_row CHECK (id = 1)
);
