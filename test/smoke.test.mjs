import test from 'node:test';
import assert from 'node:assert/strict';
import { stripWikitext } from '../src/sources/hebrew.js';
import { telegramCaption, discordEmbed, plainBody } from '../src/format.js';
import { nextRunAt, parseTime, minutesFromSendTime } from '../src/scheduler.js';
import { redact } from '../src/http.js';

const fact = {
  year: '1969',
  text: 'האדם נוחת לראשונה על הירח <ref>מקור</ref>',
  title: 'אפולו 11',
  extract: 'אפולו 11 הייתה המשימה החללית ששלחה אדם לירח.',
  imageUrl: 'https://example.org/moon.jpg',
  url: 'https://he.wikipedia.org/wiki/אפולו_11',
  lang: 'he',
  date: new Date('2026-07-20T12:00:00'),
};

test('stripWikitext מנקה קישורים, תבניות והדגשות', () => {
  const raw = "* [[1541]] – ספינה [[פורטוגל|פורטוגזית]] '''נסחפת''' {{הערה|בלה}}<ref>x</ref> לחופי [[יפן]]";
  assert.equal(stripWikitext(raw), '* 1541 – ספינה פורטוגזית נסחפת לחופי יפן');
});

test('plainBody כולל שנה, "לפני X שנים" ותקציר', () => {
  const body = plainBody(fact);
  assert.match(body, /1969/);
  assert.match(body, /לפני 57 שנים/);
  assert.match(body, /אפולו 11 הייתה/);
});

test('caption של טלגרם נשאר מתחת ל-1024 תווים וכולל קישור', () => {
  const long = { ...fact, extract: 'א'.repeat(3000), text: 'ב'.repeat(2000) };
  const caption = telegramCaption(long);
  assert.ok(caption.length <= 1024, `אורך ${caption.length}`);
  assert.match(caption, /<a href="https:\/\/he\.wikipedia\.org/);
});

test('caption מבריח תווי HTML', () => {
  const caption = telegramCaption({ ...fact, text: 'קרב <ג> & <ד>' });
  assert.match(caption, /&lt;ג&gt; &amp; &lt;ד&gt;/);
});

test('embed של דיסקורד תקין', () => {
  const embed = discordEmbed(fact);
  assert.equal(embed.url, fact.url);
  assert.equal(embed.image.url, fact.imageUrl);
  assert.ok(embed.title.length <= 256 && embed.description.length <= 4000);
});

test('embed בלי תמונה לא מכיל image ריק', () => {
  assert.equal(discordEmbed({ ...fact, imageUrl: null }).image, undefined);
});

test('סודות לא דולפים להודעות שגיאה', () => {
  assert.equal(
    redact('https://api.telegram.org/bot123456:AAG-secret_TOKEN/sendPhoto'),
    'https://api.telegram.org/bot***/sendPhoto'
  );
  assert.equal(
    redact('https://discord.com/api/webhooks/1539160342473736192/7maT-U2fMkzr_secret'),
    'https://discord.com/api/webhooks/1539160342473736192/***'
  );
});

test('המתזמן מחשב את ההרצה הבאה', () => {
  const from = new Date('2026-08-18T09:30:00');
  assert.equal(nextRunAt('08:00', from).toISOString(), new Date('2026-08-19T08:00:00').toISOString());
  assert.equal(nextRunAt('21:15', from).toISOString(), new Date('2026-08-18T21:15:00').toISOString());
  assert.throws(() => parseTime('25:00'));
  assert.throws(() => parseTime('8am'));
});

test('השומר מזהה את חלון השליחה (DST ב-GitHub Actions)', () => {
  const at = (hhmm) => new Date(`2026-08-18T${hhmm}:00`);
  const w = 55;

  // קיץ: cron של 05:00 UTC = 08:00 בישראל -> שולח
  assert.ok(minutesFromSendTime('08:00', at('08:00')) <= w);
  // עיכוב רגיל של GitHub Actions -> עדיין שולח
  assert.ok(minutesFromSendTime('08:00', at('08:35')) <= w);
  // ההרצה השנייה (06:00 UTC = 09:00 בקיץ) -> מדלג
  assert.ok(minutesFromSendTime('08:00', at('09:00')) > w);
  // חורף: 05:00 UTC = 07:00 -> מדלג, 06:00 UTC = 08:00 -> שולח
  assert.ok(minutesFromSendTime('08:00', at('07:00')) > w);
  // מרחק מעגלי: חצות קרוב ל-00:30
  assert.equal(minutesFromSendTime('00:30', at('23:50')), 40);
});
