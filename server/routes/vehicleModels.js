import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

const TABLE = 'vehicle_models';

function shapeRow(row) {
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
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
    const result = await pool.query('SELECT * FROM vehicle_models ORDER BY brand, model');
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
  const { brand, model } = req.body || {};
  if (!brand?.trim() || !model?.trim()) {
    return res.status(400).json({ error: 'กรุณากรอกแบรนด์และรุ่นรถ' });
  }

  const username = req.session.username || '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO vehicle_models (brand, model, created_by, updated_by)
       VALUES ($1, $2, $3, $3)
       ON CONFLICT (brand, model) DO NOTHING RETURNING *`,
      [brand.trim(), model.trim(), username]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'มีแบรนด์และรุ่นรถนี้อยู่แล้ว' });
    }
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

// Populates the registry from the distinct brand/model_code pairs already
// saved in external_sales (ข้อมูลการขาย), skipping pairs already present.
router.post('/sync-from-sales', async (req, res, next) => {
  const username = req.session.username || '';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `INSERT INTO vehicle_models (brand, model, created_by, updated_by)
       SELECT DISTINCT brand, model_code, $1, $1
       FROM external_sales
       WHERE brand <> '' AND model_code <> ''
       ON CONFLICT (brand, model) DO NOTHING
       RETURNING *`,
      [username]
    );
    const inserted = result.rows;
    if (inserted.length) {
      await logActivity(client, {
        recordId: null,
        action: 'insert',
        summary: `ดึงจากข้อมูลการขาย ${inserted.length} รายการ`,
        username,
      });
    }
    await client.query('COMMIT');
    res.status(201).json({ inserted: inserted.map(shapeRow), insertedCount: inserted.length });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.patch('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const { brand, model } = req.body || {};
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
  if (model !== undefined) {
    values.push(model.trim());
    sets.push(`model = $${values.length}`);
  }

  values.push(id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE vehicle_models SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING *`,
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
    if (err.code === '23505') {
      return res.status(409).json({ error: 'มีแบรนด์และรุ่นรถนี้อยู่แล้ว' });
    }
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
    const existing = await client.query('SELECT * FROM vehicle_models WHERE id = $1', [id]);
    const row = existing.rows[0];
    if (!row) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบข้อมูล' });
    }
    await client.query('DELETE FROM vehicle_models WHERE id = $1', [id]);
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
