import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const FILE = path.join(config.dataDir, 'sent.json');

export const factKey = (fact) =>
  createHash('sha1').update(`${config.lang}|${fact.year || ''}|${fact.text.slice(0, 80)}`).digest('hex').slice(0, 16);

function load() {
  if (!existsSync(FILE)) return [];
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // קובץ פגום - מתחילים מחדש במקום לקרוס
  }
}

function save(entries) {
  mkdirSync(config.dataDir, { recursive: true });
  writeFileSync(FILE, JSON.stringify(entries, null, 2), 'utf8');
}

/** מפתחות שנשלחו בטווח NO_REPEAT_DAYS האחרונים */
export function recentKeys() {
  const cutoff = Date.now() - config.noRepeatDays * 864e5;
  return new Set(load().filter((e) => new Date(e.sentAt).getTime() >= cutoff).map((e) => e.key));
}

export function remember(fact) {
  const cutoff = Date.now() - config.noRepeatDays * 864e5;
  const entries = load().filter((e) => new Date(e.sentAt).getTime() >= cutoff);
  entries.push({
    key: factKey(fact),
    sentAt: new Date().toISOString(),
    year: fact.year,
    title: fact.title,
  });
  save(entries);
}
