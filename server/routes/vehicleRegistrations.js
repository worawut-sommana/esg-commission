import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const TABLE = 'vehicle_registrations';

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
    weight: toNum(row.weight),
    registrationFee,
    customerFee,
    diff: customerFee - registrationFee,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function logActivity(client, { recordId, action, summary, username }) {
  await client.query(
    `INSERT INTO activity_log (table_name, record_id, action, summary, username) VALUES ($1, $2, $3, $4, $5)`,
    [TABLE, recordId ?? null, action, summary, username || '']
  );
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

router.get('/activity', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, record_id, action, summary, username, created_at
       FROM activity_log WHERE table_name = $1
       ORDER BY created_at DESC LIMIT 200`,
      [TABLE]
    );
    res.json(
      result.rows.map((r) => ({
        id: r.id,
        recordId: r.record_id,
        action: r.action,
        summary: r.summary,
        username: r.username,
        createdAt: r.created_at,
      }))
    );
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { brand, importType, model, year, weight, registrationFee, customerFee } = req.body || {};
  if (!brand?.trim() || !model?.trim()) {
    return res.status(400).json({ error: 'กรุณากรอกแบรนด์และรุ่นรถ' });
  }

  const username = req.session.username || '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO vehicle_registrations
         (brand, import_type, model, year, weight, registration_fee, customer_fee, created_by, updated_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *`,
      [brand.trim(), (importType || '').trim(), model.trim(), (year || '').trim(), toNum(weight), toNum(registrationFee), toNum(customerFee), username]
    );
    const row = result.rows[0];
    await logActivity(client, {
      recordId: row.id,
      action: 'insert',
      summary: `${row.brand} ${row.model}`.trim(),
      username,
    });
    await client.query('COMMIT');
    res.status(201).json(shapeRow(row));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
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

  const username = req.session.username || '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = [];
    for (const r of valid) {
      const result = await client.query(
        `INSERT INTO vehicle_registrations
           (brand, import_type, model, year, weight, registration_fee, customer_fee, created_by, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8) RETURNING *`,
        [r.brand.trim(), (r.importType || '').trim(), r.model.trim(), (r.year || '').trim(), toNum(r.weight), toNum(r.registrationFee), toNum(r.customerFee), username]
      );
      inserted.push(result.rows[0]);
    }
    await logActivity(client, {
      recordId: null,
      action: 'insert',
      summary: `นำเข้าจาก Excel ${inserted.length} รายการ`,
      username,
    });
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
  const { brand, importType, model, year, weight, registrationFee, customerFee } = req.body || {};
  if (brand !== undefined && !brand.trim()) {
    return res.status(400).json({ error: 'แบรนด์ห้ามเว้นว่าง' });
  }
  if (model !== undefined && !model.trim()) {
    return res.status(400).json({ error: 'รุ่นรถห้ามเว้นว่าง' });
  }

  const username = req.session.username || '';
  const sets = ['updated_at = now()', 'updated_by = $1'];
  const values = [username];
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
  if (weight !== undefined) {
    values.push(toNum(weight));
    sets.push(`weight = $${values.length}`);
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE vehicle_registrations SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    const row = result.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบข้อมูล' });
    }
    await logActivity(client, {
      recordId: row.id,
      action: 'update',
      summary: `${row.brand} ${row.model}`.trim(),
      username,
    });
    await client.query('COMMIT');
    res.json(shapeRow(row));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const username = req.session.username || '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM vehicle_registrations WHERE id = $1', [id]);
    const row = existing.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบข้อมูล' });
    }
    await client.query('DELETE FROM vehicle_registrations WHERE id = $1', [id]);
    await logActivity(client, {
      recordId: id,
      action: 'delete',
      summary: `${row.brand} ${row.model}`.trim(),
      username,
    });
    await client.query('COMMIT');
    res.status(204).end();
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
