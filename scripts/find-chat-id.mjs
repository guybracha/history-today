#!/usr/bin/env node
/**
 * מוצא את TELEGRAM_CHAT_ID: שלחו לבוט הודעה כלשהי (למשל /start) והריצו את הסקריפט.
 * לערוץ/קבוצה: הוסיפו את הבוט כאדמין ופרסמו שם הודעה כלשהי.
 *
 *   node scripts/find-chat-id.mjs [--wait]
 */
import { config } from '../src/config.js';

const waitMode = process.argv.includes('--wait');
const api = (m, q = '') => `https://api.telegram.org/bot${config.telegram.token}/${m}${q}`;

if (!config.telegram.token) {
  console.error('❌ אין TELEGRAM_BOT_TOKEN ב-.env');
  process.exit(1);
}

async function poll() {
  const res = await fetch(api('getUpdates', '?timeout=30&limit=100'));
  const data = await res.json();
  if (!data.ok) throw new Error(data.description);

  const chats = new Map();
  for (const u of data.result) {
    const chat = (u.message || u.channel_post || u.edited_message || u.my_chat_member || {}).chat;
    if (!chat) continue;
    const name = chat.title || [chat.first_name, chat.last_name].filter(Boolean).join(' ') || '—';
    chats.set(chat.id, `${chat.type.padEnd(10)} ${name}${chat.username ? ` (@${chat.username})` : ''}`);
  }
  return chats;
}

const deadline = Date.now() + (waitMode ? 120_000 : 0);
do {
  const chats = await poll();
  if (chats.size) {
    console.log('\n✅ נמצאו הצ\'אטים הבאים. העתיקו את המזהה הרצוי ל-.env:\n');
    for (const [id, info] of chats) console.log(`   TELEGRAM_CHAT_ID=${String(id).padEnd(16)} ${info}`);
    console.log('');
    process.exit(0);
  }
  if (waitMode) process.stdout.write('.');
} while (Date.now() < deadline);

console.error(
  '\n❌ לא נמצאו הודעות.\n' +
    '   1. פתחו בטלגרם את @history_today_il_bot ולחצו Start (או שלחו כל הודעה)\n' +
    '   2. לערוץ/קבוצה: הוסיפו את הבוט כאדמין ופרסמו שם הודעה\n' +
    '   3. הריצו שוב:  node scripts/find-chat-id.mjs\n' +
    '   שימו לב: אם מוגדר webhook לבוט, getUpdates יחזיר ריק.'
);
process.exit(1);
