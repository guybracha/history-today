import { getJson } from '../http.js';

/**
 * מקור ראשי לשפות שנתמכות ב-API "On this day" של ויקימדיה
 * (en, de, fr, es, pt, ru, ar, sv, bs ועוד. עברית *לא* נתמכת - ראו hebrew.js)
 *
 * תיעוד: https://api.wikimedia.org/wiki/Feed_API/On_this_day
 */

const TYPE_BY_CATEGORY = {
  events: 'selected',
  births: 'births',
  deaths: 'deaths',
};

function endpoints(lang, type, mm, dd) {
  return [
    `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/onthisday/${type}/${mm}/${dd}`,
    `https://${lang}.wikipedia.org/api/rest_v1/feed/onthisday/${type}/${mm}/${dd}`,
  ];
}

export async function fetchEvents({ lang, date, category = 'events' }) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const type = TYPE_BY_CATEGORY[category] || 'selected';

  let data;
  let lastErr;
  for (const url of endpoints(lang, type, mm, dd)) {
    try {
      data = await getJson(url);
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!data) throw lastErr;

  const items = data[type] || data.selected || data.events || [];

  return items
    .filter((item) => item.text)
    .map((item) => {
      const pages = (item.pages || []).filter((p) => p && p.titles);
      return {
        year: item.year ?? null,
        text: item.text.trim(),
        candidates: pages.map((p) => ({
          title: p.titles.normalized || p.title,
          extract: p.extract || '',
          imageUrl: p.thumbnail?.source || p.originalimage?.source || null,
          url:
            p.content_urls?.desktop?.page ||
            `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.titles.canonical || p.title)}`,
        })),
      };
    });
}
