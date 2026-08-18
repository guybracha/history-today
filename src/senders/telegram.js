import { config } from '../config.js';
import { request } from '../http.js';
import { telegramCaption, headline } from '../format.js';

const api = (method) => `https://api.telegram.org/bot${config.telegram.token}/${method}`;

async function call(method, payload) {
  const res = await request(api(method), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Telegram ${method} נכשל: ${data.description}`);
  return data.result;
}

export async function send(fact) {
  const base = {
    chat_id: config.telegram.chatId,
    parse_mode: 'HTML',
    disable_notification: config.telegram.silent,
  };

  if (fact.imageUrl) {
    try {
      return await call('sendPhoto', {
        ...base,
        photo: fact.imageUrl,
        caption: telegramCaption(fact),
      });
    } catch (err) {
      // טלגרם לפעמים נכשל בהורדת התמונה מ-Wikimedia; נשלח טקסט במקום
      console.warn(`⚠️  שליחת התמונה נכשלה (${err.message}) - שולח כטקסט`);
    }
  }

  return call('sendMessage', {
    ...base,
    text: telegramCaption(fact, { limit: 4096 }),
    link_preview_options: { prefer_large_media: true, url: fact.url },
  });
}

export async function verify() {
  const me = await call('getMe', {});
  return `Telegram: מחובר כ-@${me.username} (${headline({ lang: config.lang, date: new Date() })})`;
}
