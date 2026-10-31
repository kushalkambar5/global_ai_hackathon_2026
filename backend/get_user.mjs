import { db } from './src/db/index.js';
import { sql } from 'drizzle-orm';
const r = await db.execute(sql`SELECT id FROM users LIMIT 1`);
console.log('First user ID:', r.rows[0]?.id || 'no users found');
process.exit(0);
