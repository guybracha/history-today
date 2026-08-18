const LOCALES = { he: 'he-IL', en: 'en-US', ar: 'ar', ru: 'ru-RU', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', pt: 'pt-BR', sv: 'sv-SE' };

const STRINGS = {
  he: { title: 'היום בהיסטוריה', readMore: 'לקריאה נוספת', yearsAgo: (n) => `לפני ${n} שנים` },
  en: { title: 'On This Day', readMore: 'Read more', yearsAgo: (n) => `${n} years ago` },
};

const t = (lang) => STRINGS[lang] || STRINGS.en;

export function formatDate(date, lang) {
  return new Intl.DateTimeFormat(LOCALES[lang] || 'en-US', { day: 'numeric', month: 'long' }).format(date);
}

function yearsAgo(fact) {
  const n = Number(String(fact.year || '').match(/^\d{1,4}$/)?.[0]);
  if (!n) return null;
  const diff = fact.date.getFullYear() - n;
  return diff > 0 ? t(fact.lang).yearsAgo(diff) : null;
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function clip(s, max) {
  if (!s || s.length <= max) return s || '';
  return s.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/** כותרת קצרה: "היום בהיסטוריה — 18 באוגוסט" */
export function headline(fact) {
  return `${t(fact.lang).title} — ${formatDate(fact.date, fact.lang)}`;
}

/** גוף ההודעה כטקסט נקי */
export function plainBody(fact) {
  const ago = yearsAgo(fact);
  const lines = [];
  lines.push(`${fact.year ? `${fact.year}${ago ? ` (${ago})` : ''} — ` : ''}${fact.text}`);
  const extract = clip(fact.extract, 320);
  if (extract && !fact.text.includes(extract.slice(0, 40))) lines.push('', extract);
  return lines.join('\n');
}

/** caption ל-Telegram (parse_mode=HTML, מגבלת 1024 תווים בתמונה) */
export function telegramCaption(fact, { limit = 1024 } = {}) {
  const link = `🔗 <a href="${encodeURI(fact.url)}">${escapeHtml(clip(fact.title, 80))}</a>`;
  const head = `📜 <b>${escapeHtml(headline(fact))}</b>`;
  const tail = `\n\n${link}`;
  const room = limit - head.length - tail.length - 4;
  return `${head}\n\n${escapeHtml(clip(plainBody(fact), Math.max(room, 100)))}${tail}`;
}

/** embed ל-Discord */
export function discordEmbed(fact) {
  return {
    title: clip(`📜 ${headline(fact)}`, 256),
    url: fact.url,
    description: clip(plainBody(fact), 4000),
    color: 0xb8860b,
    image: fact.imageUrl ? { url: fact.imageUrl } : undefined,
    author: { name: clip(fact.title, 256), url: fact.url },
    footer: { text: `${t(fact.lang).readMore} • Wikipedia` },
    timestamp: new Date().toISOString(),
  };
}

/** תצוגה מקדימה בטרמינל */
export function consolePreview(fact) {
  return [
    '─'.repeat(60),
    `📜 ${headline(fact)}`,
    '',
    plainBody(fact),
    '',
    `🖼  ${fact.imageUrl || '(אין תמונה)'}`,
    `🔗 ${fact.title}: ${fact.url}`,
    '─'.repeat(60),
  ].join('\n');
}
