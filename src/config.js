import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Node >= 20.12 יודע לטעון .env בעצמו, בלי חבילות חיצוניות
const envFile = path.join(ROOT, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

// אזור זמן: על שרת ברירת המחדל היא UTC, מה שיזיז את שעת השליחה ואת "התאריך של היום".
// חייב להיקבע לפני כל שימוש ב-Date.
if (process.env.TZ) process.env.TZ = process.env.TZ.trim();

const bool = (v, def) => (v === undefined ? def : /^(1|true|yes|on)$/i.test(v.trim()));

export const config = {
  lang: (process.env.WIKI_LANG || 'he').toLowerCase(),
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  sendTime: process.env.SEND_TIME || '08:00',
  category: process.env.CATEGORY || 'events', // events | births | deaths  (רלוונטי בעברית)
  noRepeatDays: Number(process.env.NO_REPEAT_DAYS || 365),
  userAgent:
    process.env.USER_AGENT ||
    'history-today-bot/1.0 (https://github.com/; on-this-day daily digest)',

  telegram: {
    enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    token: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    silent: bool(process.env.TELEGRAM_SILENT, false),
  },

  discord: {
    enabled: Boolean(process.env.DISCORD_WEBHOOK_URL),
    webhookUrl: process.env.DISCORD_WEBHOOK_URL,
    username: process.env.DISCORD_USERNAME || 'היום בהיסטוריה',
  },

  dataDir: path.join(ROOT, 'data'),
};

export function assertHasTarget() {
  if (!config.telegram.enabled && !config.discord.enabled) {
    throw new Error(
      'לא הוגדר אף יעד שליחה. הגדירו TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID ו/או DISCORD_WEBHOOK_URL בקובץ .env'
    );
  }
}
