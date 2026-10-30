import pg from 'pg';

const base = 'postgresql://postgres:postgres@localhost:5432';
const client = new pg.Client({ connectionString: base + '/postgres' });
await client.connect();

// Check if hippohealth DB exists
const r = await client.query("SELECT datname FROM pg_database WHERE datname = 'hippohealth'");
if (r.rowCount === 0) {
  console.log('Creating hippohealth database...');
  await client.query('CREATE DATABASE hippohealth');
  console.log('✅ hippohealth database created.');
} else {
  console.log('✅ hippohealth database already exists.');
}

await client.end();

// Now connect to hippohealth and list tables
const client2 = new pg.Client({ connectionString: base + '/hippohealth' });
await client2.connect();
const t = await client2.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename");
console.log('Tables in hippohealth:', t.rows.map(x => x.tablename).join(', ') || '(none — migrations needed)');
await client2.end();
