import { config } from './config.js';
import * as feed from './sources/feed.js';
import * as hebrew from './sources/hebrew.js';
import { factKey, recentKeys } from './history-log.js';

const MAX_ENRICH_REQUESTS = 12; // תקרה על מספר הקריאות לוויקיפדיה בכל ריצה

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * בוחר עובדה היסטורית ליום נתון, כולל תמונה וקישור לקריאה נוספת.
 * מעדיף עובדה שלא נשלחה לאחרונה ושיש לה תמונה.
 */
export async function pickFact({ date = new Date(), lang = config.lang, category = config.category } = {}) {
  const isHebrew = lang === 'he';
  const events = isHebrew
    ? await hebrew.fetchEvents({ date, category })
    : await feed.fetchEvents({ lang, date, category });

  if (!events.length) throw new Error(`לא נמצאו אירועים לתאריך ${date.toDateString()} בשפה ${lang}`);

  const seen = recentKeys();
  const fresh = events.filter((e) => !seen.has(factKey(e)));
  const pool = shuffle(fresh.length ? fresh : events);

  let budget = MAX_ENRICH_REQUESTS;
  let fallback = null;

  for (const event of pool) {
    for (const candidate of event.candidates) {
      let page = candidate;
      if (isHebrew) {
        if (budget-- <= 0) break;
        try {
          page = await hebrew.enrich(candidate);
        } catch {
          continue; // ערך חסר/שגיאה - ננסה את הקישור הבא
        }
        if (!page) continue;
      }
      const fact = {
        year: event.year,
        text: event.text,
        title: page.title,
        extract: page.extract,
        imageUrl: page.imageUrl,
        url: page.url,
        lang,
        date,
      };
      if (page.imageUrl) return fact; // העדפה ראשונה: עובדה עם תמונה
      fallback ||= fact;
    }
    if (budget <= 0) break;
  }

  if (fallback) return fallback; // בלי תמונה - עדיף מאשר כלום
  throw new Error('לא נמצאה עובדה מתאימה עם ערך ויקיפדיה תקין');
}
