// Quick test to verify ai_chats saving works end-to-end
import { db } from './src/db/index.js';
import { aiChats } from './src/db/schema.js';
import { eq } from 'drizzle-orm';

const TEST_USER_ID = process.argv[2];
if (!TEST_USER_ID) {
  console.error('Usage: node test_ai_chats.mjs <user-uuid>');
  process.exit(1);
}

console.log('Testing ai_chats persistence for user:', TEST_USER_ID);

// 1. Check if record exists
const [existing] = await db.select().from(aiChats).where(eq(aiChats.userId, TEST_USER_ID));
console.log('Existing record:', existing ? `Found (${existing.chats.length} chats)` : 'None');

// 2. Insert or update test entry
const now = new Date().toISOString();
const testEntry = { chat_text: 'Test message at ' + now, created_at: now, created_by: 'user' };
const aiTestEntry = { chat_text: 'Test AI reply at ' + now, created_at: now, created_by: 'ai' };

const prevChats = Array.isArray(existing?.chats) ? existing.chats : [];
const updatedChats = [...prevChats, testEntry, aiTestEntry].slice(-10);

if (existing) {
  await db.update(aiChats).set({ chats: updatedChats, updatedAt: new Date() }).where(eq(aiChats.userId, TEST_USER_ID));
  console.log('Updated existing record. Total chats now:', updatedChats.length);
} else {
  await db.insert(aiChats).values({ userId: TEST_USER_ID, chats: updatedChats, chatSummary: 'Test summary' });
  console.log('Inserted new record with', updatedChats.length, 'chats');
}

// 3. Read back
const [verify] = await db.select().from(aiChats).where(eq(aiChats.userId, TEST_USER_ID));
console.log('Verified chats:', verify.chats.length, 'entries');
console.log('Latest entry:', verify.chats.at(-1));

process.exit(0);
