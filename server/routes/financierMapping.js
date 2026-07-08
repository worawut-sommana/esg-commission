import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const [externalRes, financierRes, mappingRes] = await Promise.all([
      pool.query(
        `SELECT sale_condition AS value, count(*) AS count
         FROM external_sales
         WHERE sale_condition <> ''
         GROUP BY sale_condition
         ORDER BY count DESC, sale_condition`
      ),
      pool.query(`SELECT DISTINCT financier FROM records WHERE financier <> '' ORDER BY financier`),
      pool.query('SELECT external_value, financier FROM financier_mapping'),
    ]);

    const mappings = {};
    for (const row of mappingRes.rows) mappings[row.external_value] = row.financier;

    res.json({
      externalValues: externalRes.rows.map((r) => ({ value: r.value, count: Number(r.count) })),
      financierCodes: financierRes.rows.map((r) => r.financier),
      mappings,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/', async (req, res, next) => {
  const { mappings } = req.body || {};
  if (!mappings || typeof mappings !== 'object') {
    return res.status(400).json({ error: 'mappings is required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [externalValue, financier] of Object.entries(mappings)) {
      if (!externalValue) continue;
      const trimmed = (financier || '').trim();
      if (trimmed) {
        await client.query(
          `INSERT INTO financier_mapping (external_value, financier, updated_at)
           VALUES ($1, $2, now())
           ON CONFLICT (external_value) DO UPDATE SET financier = $2, updated_at = now()`,
          [externalValue, trimmed]
        );
      } else {
        await client.query('DELETE FROM financier_mapping WHERE external_value = $1', [externalValue]);
      }
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
