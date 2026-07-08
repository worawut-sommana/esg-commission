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

router.get('/data', async (req, res, next) => {
  try {
    const settings = await getSettings();
    if (!settings.api_url || !settings.api_key) {
      return res.status(400).json({ error: 'ยังไม่ได้ตั้งค่า API กรุณาไปที่หน้าตั้งค่าก่อน' });
    }

    const url = new URL(settings.api_url);
    const { date_from, date_to, branch, brand } = req.query;
    if (date_from) url.searchParams.set('date_from', date_from);
    if (date_to) url.searchParams.set('date_to', date_to);
    url.searchParams.set('branch', branch || '%');
    if (brand) url.searchParams.set('brand', brand);

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

export default router;
