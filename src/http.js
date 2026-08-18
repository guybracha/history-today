import { config } from './config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** מסתיר סודות מכתובות שמגיעות להודעות שגיאה וללוגים */
export const redact = (url) =>
  String(url)
    .replace(/\/bot\d+:[\w-]+\//, '/bot***/') // טוקן טלגרם
    .replace(/(\/api\/webhooks\/\d+\/)[\w-]+/, '$1***'); // webhook של דיסקורד

/**
 * fetch עם User-Agent (ויקיפדיה דורשת), timeout ו-retry עם backoff.
 */
export async function request(url, options = {}, { retries = 2, timeoutMs = 15000 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': config.userAgent,
          Accept: 'application/json',
          ...(options.headers || {}),
        },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(`HTTP ${res.status} ${res.statusText} עבור ${redact(url)}\n${body.slice(0, 300)}`);
        err.status = res.status;
        // 404 הוא תשובה סופית - אין טעם לנסות שוב
        if (res.status === 404 || res.status === 400) throw err;
        throw Object.assign(err, { retryable: true });
      }
      return res;
    } catch (err) {
      lastErr = err;
      const retryable = err.retryable || err.name === 'AbortError' || err.name === 'TypeError';
      if (!retryable || attempt === retries) throw err;
      await sleep(500 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

export async function getJson(url, opts) {
  const res = await request(url, {}, opts);
  return res.json();
}
