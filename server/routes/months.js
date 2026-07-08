import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function brandTotal(b) {
  return toNum(b.com1) + toNum(b.chunk2) + toNum(b.reg_diff);
}

function sumBrands(brands) {
  return brands.reduce(
    (t, b) => {
      t.units += toNum(b.units);
      t.value += toNum(b.value);
      t.com1 += toNum(b.com1);
      t.chunk2 += toNum(b.chunk2);
      t.regDiff += toNum(b.reg_diff);
      t.total += brandTotal(b);
      return t;
    },
    { units: 0, value: 0, com1: 0, chunk2: 0, regDiff: 0, total: 0 }
  );
}

function shapeMonth(monthRow, brandRows, recordRows) {
  const brands = brandRows.map((b) => ({
    brand: b.brand,
    units: toNum(b.units),
    value: toNum(b.value),
    com1: toNum(b.com1),
    chunk2: toNum(b.chunk2),
    regDiff: toNum(b.reg_diff),
    total: brandTotal(b),
  }));
  const records = recordRows.map((r) => ({
    brand: r.brand,
    name: r.name,
    model: r.model,
    vin: r.vin,
    financier: r.financier,
    deliveryDate: r.delivery_date,
    price: toNum(r.price),
    com: toNum(r.com),
  }));
  const totals = sumBrands(brandRows);
  const deduct = toNum(monthRow.deduct);
  return {
    id: monthRow.id,
    label: monthRow.label,
    billing: monthRow.billing,
    deduct,
    net: totals.total - deduct,
    totals,
    brands,
    records,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const [monthsR, brandsR, recordsR] = await Promise.all([
      pool.query('SELECT * FROM months ORDER BY created_at ASC'),
      pool.query('SELECT * FROM brands ORDER BY id ASC'),
      pool.query('SELECT * FROM records ORDER BY id ASC'),
    ]);

    const brandsByMonth = new Map();
    for (const b of brandsR.rows) {
      if (!brandsByMonth.has(b.month_id)) brandsByMonth.set(b.month_id, []);
      brandsByMonth.get(b.month_id).push(b);
    }
    const recordsByMonth = new Map();
    for (const r of recordsR.rows) {
      if (!recordsByMonth.has(r.month_id)) recordsByMonth.set(r.month_id, []);
      recordsByMonth.get(r.month_id).push(r);
    }

    const months = monthsR.rows.map((m) =>
      shapeMonth(m, brandsByMonth.get(m.id) || [], recordsByMonth.get(m.id) || [])
    );
    res.json(months);
  } catch (err) {
    next(err);
  }
});

async function insertBrand(client, monthId, b) {
  const r = await client.query(
    `INSERT INTO brands (month_id, brand, units, value, com1, chunk2, reg_diff)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [monthId, b.brand, toNum(b.units), toNum(b.value), toNum(b.com1), toNum(b.chunk2), toNum(b.regDiff)]
  );
  return r.rows[0];
}

async function insertRecord(client, monthId, rec) {
  const r = await client.query(
    `INSERT INTO records (month_id, brand, name, model, vin, financier, delivery_date, price, com)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
    [
      monthId,
      rec.brand,
      rec.name || '',
      rec.model || '',
      rec.vin || '',
      rec.financier || '',
      rec.deliveryDate || '',
      toNum(rec.price),
      toNum(rec.com),
    ]
  );
  return r.rows[0];
}

async function fetchMonthShaped(monthId) {
  const [monthR, brandsR, recordsR] = await Promise.all([
    pool.query('SELECT * FROM months WHERE id = $1', [monthId]),
    pool.query('SELECT * FROM brands WHERE month_id = $1 ORDER BY id ASC', [monthId]),
    pool.query('SELECT * FROM records WHERE month_id = $1 ORDER BY id ASC', [monthId]),
  ]);
  if (!monthR.rows.length) return null;
  return shapeMonth(monthR.rows[0], brandsR.rows, recordsR.rows);
}

router.post('/', async (req, res, next) => {
  const { label, billing, deduct, brands, records } = req.body || {};
  if (!Array.isArray(brands) || !brands.length) {
    return res.status(400).json({ error: 'brands must be a non-empty array' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const monthResult = await client.query(
      'INSERT INTO months (label, billing, deduct) VALUES ($1, $2, $3) RETURNING *',
      [label || '-', billing || '-', toNum(deduct)]
    );
    const month = monthResult.rows[0];

    const brandRows = [];
    for (const b of brands) {
      brandRows.push(await insertBrand(client, month.id, b));
    }

    const recordRows = [];
    for (const rec of records || []) {
      recordRows.push(await insertRecord(client, month.id, rec));
    }

    await client.query('COMMIT');
    res.status(201).json(shapeMonth(month, brandRows, recordRows));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// Add a brand (with its records) into an already-saved month. If the brand
// already exists in that month, its data is replaced rather than duplicated —
// this lets a dealership upload one brand file at a time, across separate
// sessions, into the same billing round.
router.patch('/:id/brands', async (req, res, next) => {
  const { brand, units, value, com1, chunk2, regDiff, records } = req.body || {};
  if (!brand) {
    return res.status(400).json({ error: 'brand is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const monthCheck = await client.query('SELECT id FROM months WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!monthCheck.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'month not found' });
    }

    await client.query('DELETE FROM records WHERE month_id = $1 AND brand = $2', [req.params.id, brand]);
    await client.query('DELETE FROM brands WHERE month_id = $1 AND brand = $2', [req.params.id, brand]);

    await insertBrand(client, req.params.id, { brand, units, value, com1, chunk2, regDiff });
    for (const rec of records || []) {
      await insertRecord(client, req.params.id, { ...rec, brand });
    }

    await client.query('COMMIT');
    res.json(await fetchMonthShaped(req.params.id));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM months WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
