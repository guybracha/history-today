import { getJson } from '../http.js';

/**
 * מקור לעברית.
 * ל-API הרשמי "On this day" של ויקימדיה אין תמיכה בעברית (מחזיר 404),
 * ולכן אנחנו קוראים את עמוד התאריך בוויקיפדיה העברית ("18 באוגוסט")
 * דרך ה-action API החינמי, ומפרקים את סעיף האירועים.
 */

const MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

const SECTION_BY_CATEGORY = {
  events: 'אירועים',
  births: 'נולדו',
  deaths: 'נפטרו',
};

export function hebrewDateTitle(date) {
  return `${date.getDate()} ב${MONTHS[date.getMonth()]}`;
}

/** ניקוי wikitext לטקסט קריא */
export function stripWikitext(raw) {
  let s = raw;
  s = s.replace(/<ref[^>]*\/>/gi, '');
  s = s.replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  for (let i = 0; i < 3; i++) s = s.replace(/\{\{[^{}]*\}\}/g, ''); // תבניות, כולל מקוננות
  s = s.replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1'); // [[יעד|תצוגה]]
  s = s.replace(/\[\[([^\]]*)\]\]/g, '$1'); // [[יעד]]
  s = s.replace(/\[(?:https?:)?\/\/\S+\s+([^\]]+)\]/g, '$1'); // קישור חיצוני עם תווית
  s = s.replace(/\[(?:https?:)?\/\/\S+\]/g, '');
  s = s.replace(/'''''|'''|''/g, '');
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
  return s.replace(/\s+/g, ' ').trim();
}

/** כל יעדי הקישורים הפנימיים בשורה, לפי סדר הופעה */
function linkTargets(raw) {
  const out = [];
  for (const m of raw.matchAll(/\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g)) {
    const target = m[1].trim();
    if (target && !out.includes(target)) out.push(target);
  }
  return out;
}

const YEARISH = /^\d{1,4}(\s*(לפנה"ס|לפני הספירה|לספירה))?$/;
const isYear = (t) => YEARISH.test(t.trim());

function extractSection(wikitext, heading) {
  const re = new RegExp(`^=+\\s*${heading}[^=]*=+\\s*$`, 'm');
  const start = wikitext.search(re);
  if (start === -1) return '';
  const body = wikitext.slice(start + wikitext.slice(start).indexOf('\n') + 1);
  const nextHeading = body.search(/^=+[^=\n]+=+\s*$/m);
  return nextHeading === -1 ? body : body.slice(0, nextHeading);
}

async function fetchWikitext(title) {
  const url =
    'https://he.wikipedia.org/w/api.php?action=parse&prop=wikitext&formatversion=2&format=json' +
    `&redirects=1&page=${encodeURIComponent(title)}`;
  const data = await getJson(url);
  if (data.error) throw new Error(`ויקיפדיה החזירה שגיאה: ${data.error.info}`);
  return data.parse?.wikitext || '';
}

export async function fetchEvents({ date, category = 'events' }) {
  const wikitext = await fetchWikitext(hebrewDateTitle(date));
  const section = extractSection(wikitext, SECTION_BY_CATEGORY[category] || 'אירועים');

  const events = [];
  for (const line of section.split('\n')) {
    if (!/^\*+\s*\S/.test(line)) continue;
    const raw = line.replace(/^\*+\s*/, '');
    const clean = stripWikitext(raw);
    if (clean.length < 20) continue;

    // "1541 – ספינה פורטוגזית נסחפת..." => שנה + טקסט
    const m = clean.match(/^([^–—-]{1,24}?)\s*[–—-]\s*(.+)$/);
    let year = null;
    let text = clean;
    if (m && /\d/.test(m[1])) {
      year = m[1].trim();
      text = m[2].trim();
    }

    // ערכים ספציפיים (שם מרובה מילים - אדם, אירוע, ארגון) עדיפים על ערכים כלליים
    // כמו שם מדינה, גם אם הם מופיעים ראשונים בשורה.
    const candidates = linkTargets(raw)
      .filter((t) => !isYear(t) && !/^(קובץ|תמונה|קטגוריה|File|Image|Category):/i.test(t))
      .map((title, i) => ({ title, rank: (title.includes(' ') ? 0 : 1) * 100 + i }))
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
      .map(({ title }) => ({ title }));

    if (!candidates.length) continue;
    events.push({ year, text, candidates });
  }
  return events;
}

/** משלים תקציר, תמונה וקישור לערך מוויקיפדיה העברית */
export async function enrich(candidate) {
  const slug = encodeURIComponent(candidate.title.replace(/ /g, '_'));
  const s = await getJson(`https://he.wikipedia.org/api/rest_v1/page/summary/${slug}`);
  if (s.type === 'disambiguation') return null;
  return {
    title: s.title,
    extract: s.extract || '',
    imageUrl: s.thumbnail?.source || s.originalimage?.source || null,
    url:
      s.content_urls?.desktop?.page ||
      `https://he.wikipedia.org/wiki/${slug}`,
  };
}
