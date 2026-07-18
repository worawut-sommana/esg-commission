import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function shapeRow(row) {
  return {
    id: row.id,
    brand: row.brand,
    importType: row.import_type,
    model: row.model,
    month: row.month,
    year: row.year,
    bookingControl: row.booking_control,
    bookingStart: row.booking_start,
    bookingEnd: row.booking_end,
    msrp: toNum(row.msrp),
    rsPrice: toNum(row.rs_price),
    msrpDiscount: toNum(row.msrp_discount),
    note: row.note,
  };
}

function fields(body) {
  const { brand, importType, model, month, year, bookingControl, bookingStart, bookingEnd, msrp, rsPrice, msrpDiscount, note } =
    body || {};
  return { brand, importType, model, month, year, bookingControl, bookingStart, bookingEnd, msrp, rsPrice, msrpDiscount, note };
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM vehicle_campaigns ORDER BY brand, model, year, month');
    res.json(result.rows.map(shapeRow));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { brand, importType, model, month, year, bookingControl, bookingStart, bookingEnd, msrp, rsPrice, msrpDiscount, note } =
    fields(req.body);
  if (!brand?.trim() || !model?.trim()) {
    return res.status(400).json({ error: 'กรุณากรอกแบรนด์และรุ่นรถ' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO vehicle_campaigns
        (brand, import_type, model, month, year, booking_control, booking_start, booking_end, msrp, rs_price, msrp_discount, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [
        brand.trim(),
        (importType || '').trim(),
        model.trim(),
        (month || '').trim(),
        (year || '').trim(),
        (bookingControl || '').trim(),
        (bookingStart || '').trim(),
        (bookingEnd || '').trim(),
        toNum(msrp),
        toNum(rsPrice),
        toNum(msrpDiscount),
        (note || '').trim(),
      ]
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
        `INSERT INTO vehicle_campaigns
          (brand, import_type, model, month, year, booking_control, booking_start, booking_end, msrp, rs_price, msrp_discount, note)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
        [
          r.brand.trim(),
          (r.importType || '').trim(),
          r.model.trim(),
          (r.month || '').trim(),
          (r.year || '').trim(),
          (r.bookingControl || '').trim(),
          (r.bookingStart || '').trim(),
          (r.bookingEnd || '').trim(),
          toNum(r.msrp),
          toNum(r.rsPrice),
          toNum(r.msrpDiscount),
          (r.note || '').trim(),
        ]
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
  const { brand, importType, model, month, year, bookingControl, bookingStart, bookingEnd, msrp, rsPrice, msrpDiscount, note } =
    fields(req.body);
  if (brand !== undefined && !brand.trim()) {
    return res.status(400).json({ error: 'แบรนด์ห้ามเว้นว่าง' });
  }
  if (model !== undefined && !model.trim()) {
    return res.status(400).json({ error: 'รุ่นรถห้ามเว้นว่าง' });
  }

  const sets = ['updated_at = now()'];
  const values = [];
  const set = (column, value) => {
    values.push(value);
    sets.push(`${column} = $${values.length}`);
  };

  if (brand !== undefined) set('brand', brand.trim());
  if (importType !== undefined) set('import_type', importType.trim());
  if (model !== undefined) set('model', model.trim());
  if (month !== undefined) set('month', month.trim());
  if (year !== undefined) set('year', year.trim());
  if (bookingControl !== undefined) set('booking_control', bookingControl.trim());
  if (bookingStart !== undefined) set('booking_start', bookingStart.trim());
  if (bookingEnd !== undefined) set('booking_end', bookingEnd.trim());
  if (msrp !== undefined) set('msrp', toNum(msrp));
  if (rsPrice !== undefined) set('rs_price', toNum(rsPrice));
  if (msrpDiscount !== undefined) set('msrp_discount', toNum(msrpDiscount));
  if (note !== undefined) set('note', note.trim());

  values.push(id);
  try {
    const result = await pool.query(
      `UPDATE vehicle_campaigns SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
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
    const result = await pool.query('DELETE FROM vehicle_campaigns WHERE id = $1', [id]);
    if (!result.rowCount) return res.status(404).json({ error: 'ไม่พบข้อมูล' });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
