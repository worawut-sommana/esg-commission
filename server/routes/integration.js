import { Router } from 'express';
import { pool } from '../db.js';

const router = Router();

async function getSettings() {
  const r = await pool.query('SELECT api_url, api_key FROM integration_settings WHERE id = 1');
  return r.rows[0] || { api_url: '', api_key: '' };
}

function maskKey(key) {
  if (!key) return '';
  if (key.length <= 4) return '••••';
  return '•'.repeat(Math.max(key.length - 4, 4)) + key.slice(-4);
}

router.get('/settings', async (req, res, next) => {
  try {
    const settings = await getSettings();
    res.json({
      apiUrl: settings.api_url || '',
      hasApiKey: !!settings.api_key,
      apiKeyMasked: maskKey(settings.api_key),
    });
  } catch (err) {
    next(err);
  }
});

router.put('/settings', async (req, res, next) => {
  const { apiUrl, apiKey } = req.body || {};
  if (typeof apiUrl !== 'string') {
    return res.status(400).json({ error: 'apiUrl is required' });
  }
  try {
    const current = await getSettings();
    // An empty apiKey means "keep the existing key" so the URL can be edited
    // without having to re-paste the secret every time.
    const nextKey = apiKey ? apiKey.trim() : current.api_key;
    await pool.query(
      `INSERT INTO integration_settings (id, api_url, api_key, updated_at)
       VALUES (1, $1, $2, now())
       ON CONFLICT (id) DO UPDATE SET api_url = $1, api_key = $2, updated_at = now()`,
      [apiUrl.trim(), nextKey]
    );
    const settings = await getSettings();
    res.json({
      apiUrl: settings.api_url || '',
      hasApiKey: !!settings.api_key,
      apiKeyMasked: maskKey(settings.api_key),
    });
  } catch (err) {
    next(err);
  }
});

router.post('/test', async (req, res, next) => {
  try {
    const saved = await getSettings();
    const { apiUrl, apiKey } = req.body || {};
    // Empty override means "use whatever's already saved" — same convention
    // as the settings save endpoint, so testing works before or after saving.
    const url = (apiUrl && apiUrl.trim()) || saved.api_url;
    const key = (apiKey && apiKey.trim()) || saved.api_key;
    if (!url || !key) {
      return res.status(400).json({ error: 'กรุณากรอก API URL และ API Key ก่อนทดสอบ' });
    }

    let testUrl;
    try {
      testUrl = new URL(url);
    } catch {
      return res.status(400).json({ error: 'API URL ไม่ถูกต้อง' });
    }

    const today = new Date().toISOString().slice(0, 10);
    testUrl.searchParams.set('date_from', today);
    testUrl.searchParams.set('date_to', today);
    testUrl.searchParams.set('branch', '%');
    testUrl.searchParams.set('limit', '5');
    testUrl.searchParams.set('offset', '0');

    const upstream = await fetch(testUrl, { headers: { 'x-api-key': key } });
    const body = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: (body && body.detail) || `เชื่อมต่อไม่สำเร็จ (HTTP ${upstream.status})` });
    }
    res.json({ ok: true, total: body.total ?? 0, brands: body.brands || [], items: body.items || [] });
  } catch (err) {
    next(err);
  }
});

router.get('/data', async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings.api_url || !settings.api_key) {
      return res.status(400).json({ error: 'ยังไม่ได้ตั้งค่า API กรุณาไปที่หน้าตั้งค่าก่อน' });
    }

    const { date_from, date_to, branch, brand, limit, offset } = req.query;
    const url = new URL(settings.api_url);
    if (date_from) url.searchParams.set('date_from', date_from);
    if (date_to) url.searchParams.set('date_to', date_to);
    url.searchParams.set('branch', branch || '%');
    if (brand) url.searchParams.set('brand', brand);
    url.searchParams.set('limit', String(limit || 1000));
    url.searchParams.set('offset', String(offset || 0));

    const upstream = await fetch(url, { headers: { 'x-api-key': settings.api_key } });
    const body = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: (body && body.detail) || 'เรียก API ภายนอกไม่สำเร็จ' });
    }
    res.json(body);
  } catch (err) {
    next(err);
  }
});

router.post('/data/save', async (req, res, next) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'ไม่มีข้อมูลให้บันทึก' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const it of items) {
      if (!it.contno) {
        skipped++;
        continue;
      }
      const r = await client.query(
        `INSERT INTO external_sales (
           contno, sale_type, locat, customer_name, branch, sale_condition,
           delivery_date, chassis_no, sale_price, wholesales, model_code, msrp,
           sdate, taxno, taxdt, resvno, resv_date, brand,
           registration_paid, registration_payment_count, registration_total_paid, registration_last_paid_at,
           synced_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22, now())
         ON CONFLICT (contno) DO UPDATE SET
           sale_type = EXCLUDED.sale_type,
           locat = EXCLUDED.locat,
           customer_name = EXCLUDED.customer_name,
           branch = EXCLUDED.branch,
           sale_condition = EXCLUDED.sale_condition,
           delivery_date = EXCLUDED.delivery_date,
           chassis_no = EXCLUDED.chassis_no,
           sale_price = EXCLUDED.sale_price,
           wholesales = EXCLUDED.wholesales,
           model_code = EXCLUDED.model_code,
           msrp = EXCLUDED.msrp,
           sdate = EXCLUDED.sdate,
           taxno = EXCLUDED.taxno,
           taxdt = EXCLUDED.taxdt,
           resvno = EXCLUDED.resvno,
           resv_date = EXCLUDED.resv_date,
           brand = EXCLUDED.brand,
           registration_paid = EXCLUDED.registration_paid,
           registration_payment_count = EXCLUDED.registration_payment_count,
           registration_total_paid = EXCLUDED.registration_total_paid,
           registration_last_paid_at = EXCLUDED.registration_last_paid_at,
           synced_at = now()
         RETURNING (xmax = 0) AS inserted`,
        [
          it.contno,
          it.sale_type || '',
          it.locat || '',
          it.customer_name || '',
          it.branch || '',
          it.sale_condition || '',
          it.delivery_date || null,
          it.chassis_no || '',
          it.sale_price ?? 0,
          it.wholesales ?? 0,
          it.model_code || '',
          it.msrp ?? 0,
          it.sdate || null,
          it.taxno || '',
          it.taxdt || null,
          it.resvno || '',
          it.resv_date || null,
          it.database_name || '',
          it.registration_paid ?? false,
          it.registration_payment_count ?? 0,
          it.registration_total_paid,
          it.registration_last_paid_at || null,
        ]
      );
      if (r.rows[0].inserted) inserted++;
      else updated++;
    }

    await client.query('COMMIT');
    res.json({ inserted, updated, skipped, total: inserted + updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

export default router;
