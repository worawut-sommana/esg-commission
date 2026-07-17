import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../db.js';

const router = Router();

function shapeUser(row) {
  return { id: row.id, username: row.username, isAdmin: row.is_admin, createdAt: row.created_at };
}

async function countAdmins(client = pool) {
  const result = await client.query('SELECT COUNT(*)::int AS count FROM users WHERE is_admin = true');
  return result.rows[0].count;
}

router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT id, username, is_admin, created_at FROM users ORDER BY created_at');
    res.json(result.rows.map(shapeUser));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  const { username, password, isAdmin } = req.body || {};
  if (!username || !username.trim() || !password) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, is_admin) VALUES ($1, $2, $3) RETURNING id, username, is_admin, created_at',
      [username.trim(), passwordHash, !!isAdmin]
    );
    res.status(201).json(shapeUser(result.rows[0]));
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'มีชื่อผู้ใช้นี้อยู่แล้ว' });
    }
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  const { password, isAdmin } = req.body || {};
  if (password !== undefined && password.length < 8) {
    return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id, is_admin FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
    }

    if (isAdmin === false && existing.rows[0].is_admin && (await countAdmins(client)) <= 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน' });
    }

    const sets = [];
    const values = [];
    if (password !== undefined) {
      values.push(await bcrypt.hash(password, 12));
      sets.push(`password_hash = $${values.length}`);
    }
    if (isAdmin !== undefined) {
      values.push(!!isAdmin);
      sets.push(`is_admin = $${values.length}`);
    }
    if (sets.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ไม่มีข้อมูลที่จะอัปเดต' });
    }

    values.push(id);
    const result = await client.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${values.length} RETURNING id, username, is_admin, created_at`,
      values
    );
    await client.query('COMMIT');
    res.json(shapeUser(result.rows[0]));
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

router.delete('/:id', async (req, res, next) => {
  const id = Number(req.params.id);
  if (id === req.session.userId) {
    return res.status(400).json({ error: 'ไม่สามารถลบบัญชีของตัวเองได้' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id, is_admin FROM users WHERE id = $1 FOR UPDATE', [id]);
    if (!existing.rows[0]) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });
    }
    if (existing.rows[0].is_admin && (await countAdmins(client)) <= 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน' });
    }
    await client.query('DELETE FROM users WHERE id = $1', [id]);
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
