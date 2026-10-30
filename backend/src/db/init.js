import pg from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from './index.js';

dotenv.config();

const DEFAULT_DATABASE_URL = 'postgresql://user:password@localhost:5432/hippohealth';

function getDbConfig(rawUrl) {
  const connString = (rawUrl && typeof rawUrl === 'string' && rawUrl.trim().startsWith('postgres'))
    ? rawUrl.trim()
    : DEFAULT_DATABASE_URL;

  try {
    const url = new URL(connString);
    const dbName = url.pathname.replace(/^\//, '') || 'hippohealth';
    return { connString, url, dbName };
  } catch (e) {
    const url = new URL(DEFAULT_DATABASE_URL);
    return { connString: DEFAULT_DATABASE_URL, url, dbName: 'hippohealth' };
  }
}

export async function ensureDatabaseExists() {
  const connString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const { url, dbName } = getDbConfig(connString);

  // Connect to system DB ('postgres' or 'template1')
  const adminUrl = new URL(url.toString());
  adminUrl.pathname = '/postgres';

  let client;
  try {
    client = new pg.Client({ connectionString: adminUrl.toString() });
    await client.connect();
  } catch (err) {
    try {
      adminUrl.pathname = '/template1';
      client = new pg.Client({ connectionString: adminUrl.toString() });
      await client.connect();
    } catch (adminErr) {
      console.warn(`[DB Init Warning] Could not connect to PostgreSQL server at ${url.host}: ${adminErr.message}`);
      return false;
    }
  }

  try {
    const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);

    if (res.rowCount === 0) {
      console.log(`[DB Init] Database "${dbName}" does not exist. Creating database...`);
      const safeDbName = `"${dbName.replace(/"/g, '""')}"`;
      await client.query(`CREATE DATABASE ${safeDbName}`);
      console.log(`[DB Init] Database "${dbName}" created successfully.`);
    } else {
      console.log(`[DB Init] Database "${dbName}" exists.`);
    }
  } catch (err) {
    console.error(`[DB Init Error] Failed to check/create database "${dbName}":`, err.message);
    return false;
  } finally {
    await client.end().catch(() => {});
  }

  return true;
}

export async function seedInitialDoctors() {
  try {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL || DEFAULT_DATABASE_URL,
    });

    const passwordHash = await bcrypt.hash('doctor123', 10);
    const doctorsData = [
      {
        email: 'elizabeth.blackwell@hippohealth.com',
        fullName: 'Elizabeth Blackwell',
        specialization: 'Cardiology',
        hospital: 'Hippo General Hospital',
        experience: 12,
        bio: 'Experienced cardiologist specializing in preventive medicine and heart health diagnostics.',
        license: 'LIC-100223'
      },
      {
        email: 'joseph.lister@hippohealth.com',
        fullName: 'Joseph Lister',
        specialization: 'General Surgery',
        hospital: 'St. Jude Clinical Care',
        experience: 15,
        bio: 'Pioneer of antiseptic medicine with extensive research in advanced surgery techniques.',
        license: 'LIC-200334'
      },
      {
        email: 'alice.hamilton@hippohealth.com',
        fullName: 'Alice Hamilton',
        specialization: 'Occupational Medicine',
        hospital: 'Hippo Health AI Labs',
        experience: 10,
        bio: 'Dedicated specialist focusing on environmental health and industrial toxicology logs verification.',
        license: 'LIC-300445'
      }
    ];

    for (const doc of doctorsData) {
      const userRes = await pool.query(
        `INSERT INTO users (email, password_hash, full_name, role, onboarding_complete)
         VALUES ($1, $2, $3, 'DOCTOR', true)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [doc.email, passwordHash, doc.fullName]
      );

      const userId = userRes.rows[0].id;

      await pool.query(
        `INSERT INTO doctor_profiles (user_id, license_number, specialization, years_experience, bio, hospital_affiliation, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, true)
         ON CONFLICT (license_number) DO UPDATE SET
           specialization = EXCLUDED.specialization,
           years_experience = EXCLUDED.years_experience,
           bio = EXCLUDED.bio,
           hospital_affiliation = EXCLUDED.hospital_affiliation`,
        [userId, doc.license, doc.specialization, doc.experience, doc.bio, doc.hospital]
      );
    }

    console.log('[DB Init] Doctor profiles verified/seeded successfully.');
    await pool.end();
  } catch (err) {
    console.error('[DB Init] Seeding notice:', err.message);
  }
}

export async function initDb() {
  const dbReady = await ensureDatabaseExists();
  if (!dbReady) return;

  try {
    console.log('[DB Init] Running database migrations...');
    const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
    await migrate(db, { migrationsFolder });
    console.log('[DB Init] All migrations applied successfully.');

    await seedInitialDoctors();
  } catch (err) {
    console.error('[DB Init Error] Migration/Initialization failed:', err.message);
  }
}
