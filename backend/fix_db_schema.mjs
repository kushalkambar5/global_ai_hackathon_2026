import pg from 'pg';

const client = new pg.Client({ connectionString: 'postgresql://postgres:postgres@localhost:5432/hippohealth' });
await client.connect();

console.log('--- Applying Database Schema Fixes ---');

// 1. Add ai_suggestions column to disease_scans
await client.query(`
  ALTER TABLE disease_scans
  ADD COLUMN IF NOT EXISTS ai_suggestions text[];
`);
console.log('✅ Added ai_suggestions column to disease_scans');

// 2. Add agent_conversation_id column to chat_contexts
await client.query(`
  ALTER TABLE chat_contexts
  ADD COLUMN IF NOT EXISTS agent_conversation_id varchar(255);
`);
console.log('✅ Added agent_conversation_id column to chat_contexts');

// 3. Create doctor_patient_chats table if not exists
await client.query(`
  CREATE TABLE IF NOT EXISTS doctor_patient_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES doctor_profiles(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    CONSTRAINT unq_doctor_patient_chat UNIQUE (doctor_id, patient_id)
  );
`);
console.log('✅ Created doctor_patient_chats table');

await client.end();
console.log('--- Database Schema Fixes Applied Successfully ---');
