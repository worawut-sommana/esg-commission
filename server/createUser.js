import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

// Usage: node server/createUser.js <username> <password> [--admin]
async function run() {
  const [username, password, flag] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node server/createUser.js <username> <password> [--admin]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const isAdmin = flag === '--admin';
  const passwordHash = await bcrypt.hash(password, 12);

  await pool.query(
    `INSERT INTO users (username, password_hash, is_admin)
     VALUES ($1, $2, $3)
     ON CONFLICT (username) DO UPDATE SET password_hash = $2, is_admin = $3`,
    [username.trim(), passwordHash, isAdmin]
  );

  console.log(`User "${username}" saved${isAdmin ? ' (admin)' : ''}.`);
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
