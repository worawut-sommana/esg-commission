import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './db.js';
import { seed } from '../src/lib/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schemaSql);

  const existing = await pool.query('SELECT COUNT(*)::int AS count FROM months');
  if (existing.rows[0].count > 0) {
    console.log('months table already has data, skipping seed.');
    await pool.end();
    return;
  }

  const { months } = seed();
  for (const m of months) {
    const monthResult = await pool.query(
      'INSERT INTO months (label, billing, deduct) VALUES ($1, $2, $3) RETURNING id',
      [m.label, m.billing, m.deduct]
    );
    const monthId = monthResult.rows[0].id;

    for (const b of m.brands) {
      await pool.query(
        `INSERT INTO brands (month_id, brand, units, value, com1, chunk2, reg_diff)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [monthId, b.brand, b.units, b.value, b.com1, b.chunk2, b.regDiff]
      );
    }

    for (const r of m.records || []) {
      await pool.query(
        `INSERT INTO records (month_id, brand, name, model, vin, financier, delivery_date, price, com)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [monthId, r.brand, r.name, r.model, r.vin, r.financier, r.deliveryDate, r.price, r.com]
      );
    }
    console.log(`Seeded month "${m.label}" (${m.brands.length} brands, ${(m.records || []).length} records)`);
  }

  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
