export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'ไม่ได้เข้าสู่ระบบ' });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session?.isAdmin) {
    return res.status(403).json({ error: 'ต้องเป็นผู้ดูแลระบบเท่านั้น' });
  }
  next();
}
