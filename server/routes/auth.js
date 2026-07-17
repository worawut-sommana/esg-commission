import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const router = Router();

function shapeUser(row) {
  return { id: row.id, username: row.username, isAdmin: row.is_admin };
}

router.post('/login', async (req, res, next) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }

  try {
    const result = await pool.query('SELECT id, username, password_hash, is_admin FROM users WHERE username = $1', [
      username.trim(),
    ]);
    const user = result.rows[0];
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) {
      return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      req.session.username = user.username;
      req.session.isAdmin = user.is_admin;
      res.json(shapeUser(user));
    });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

router.get('/me', async (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'ไม่ได้เข้าสู่ระบบ' });
  }
  try {
    const result = await pool.query('SELECT id, username, is_admin FROM users WHERE id = $1', [req.session.userId]);
    const user = result.rows[0];
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'ไม่ได้เข้าสู่ระบบ' });
    }
    res.json(shapeUser(user));
  } catch (err) {
    next(err);
  }
});

export default router;
