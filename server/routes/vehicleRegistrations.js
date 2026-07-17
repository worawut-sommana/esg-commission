import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function shapeRow(row) {
  const registrationFee = toNum(row.registration_fee);
  const customerFee = toNum(row.customer_fee);
  return {
    id: row.id,
    brand: row.brand,
    importType: row.import_type,
    model: row.model,
    year: row.year,
    registrationFee,
    customerFee,
    diff: customerFee - registrationFee,
  };
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM vehicle_registrations ORDER BY brand, model, year'
    );
    res.json(result.rows.map(shapeRow));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { brand, importType, model, year, registrationFee, customerFee } = req.body || {};
  if (!brand?.trim() || !model?.trim()) {
    return res.status(400).json({ error: 'กรุณากรอกแบรนด์และรุ่นรถ' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO vehicle_registrations (brand, import_type, model, year, registration_fee, customer_fee)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [brand.trim(), (importType || '').trim(), model.trim(), (year || '').trim(), toNum(registrationFee), toNum(customerFee)]
    );
    res.status(201).json(shapeRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

router.post('/import', async (req, res, next) => {
  const { rows } = req.body || {};
  if (!Array.isArray(rows) || !rows.length) {
    return res.status(400).json({ error: 'ไม่มีรายการที่จะนำเข้า' });
  }

  const valid = rows.filter((r) => r?.brand?.trim() && r?.model?.trim());
  if (!valid.length) {
    return res.status(400).json({ error: 'ไม่มีรายการที่มีแบรนด์และรุ่นรถครบถ้วน' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const r of valid) {
      const result = await client.query(
        `INSERT INTO vehicle_registrations (brand, import_type, model, year, registration_fee, customer_fee)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [r.brand.trim(), (r.importType || '').trim(), r.model.trim(), (r.year || '').trim(), toNum(r.registrationFee), toNum(r.customerFee)]
      );
      inserted.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(inserted.map(shapeRow));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.patch('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const { brand, importType, model, year, registrationFee, customerFee } = req.body || {};
  if (brand !== undefined && !brand.trim()) {
    return res.status(400).json({ error: 'แบรนด์ห้ามเว้นว่าง' });
  }
  if (model !== undefined && !model.trim()) {
    return res.status(400).json({ error: 'รุ่นรถห้ามเว้นว่าง' });
  }

  const sets = ['updated_at = now()'];
  const values = [];
  if (brand !== undefined) {
    values.push(brand.trim());
    sets.push(`brand = $${values.length}`);
  }
  if (importType !== undefined) {
    values.push(importType.trim());
    sets.push(`import_type = $${values.length}`);
  }
  if (model !== undefined) {
    values.push(model.trim());
    sets.push(`model = $${values.length}`);
  }
  if (year !== undefined) {
    values.push(year.trim());
    sets.push(`year = $${values.length}`);
  }
  if (registrationFee !== undefined) {
    values.push(toNum(registrationFee));
    sets.push(`registration_fee = $${values.length}`);
  }
  if (customerFee !== undefined) {
    values.push(toNum(customerFee));
    sets.push(`customer_fee = $${values.length}`);
  }

  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE vehicle_registrations SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'ไม่พบข้อมูล' });
    res.json(shapeRow(result.rows[0]));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  try {
    const result = await pool.query('DELETE FROM vehicle_registrations WHERE id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'ไม่พบข้อมูล' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
