import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { date_from, date_to } = req.query;
    const conditions = [];
    const params = [];

    if (date_from) {
      params.push(date_from);
      conditions.push(`sdate >= $${params.length}`);
    }
    if (date_to) {
      params.push(date_to);
      conditions.push(`sdate < ($${params.length}::date + interval '1 day')`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const r = await pool.query(
      `SELECT contno, sale_type, locat, customer_name, branch, sale_condition,
              delivery_date, chassis_no, sale_price, wholesales, model_code, msrp,
              sdate, taxno, taxdt, resvno, brand,
              registration_paid, registration_payment_count, registration_total_paid, registration_last_paid_at,
              synced_at
       FROM external_sales
       ${where}
       ORDER BY sdate DESC NULLS LAST`,
      params
    );

    res.json({ items: r.rows, total: r.rows.length });
  } catch (err) {
    next(err);
  }
});

export default router;
