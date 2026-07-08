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
      const r = await client.query(
        `INSERT INTO brands (month_id, brand, units, value, com1, chunk2, reg_diff)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [month.id, b.brand, toNum(b.units), toNum(b.value), toNum(b.com1), toNum(b.chunk2), toNum(b.regDiff)]
      );
      brandRows.push(r.rows[0]);
    }

    const recordRows = [];
    for (const rec of records || []) {
      const r = await client.query(
        `INSERT INTO records (month_id, brand, name, model, vin, financier, delivery_date, price, com)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          month.id,
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
      recordRows.push(r.rows[0]);
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
