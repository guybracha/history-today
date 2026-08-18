/** מתזמן יומי פשוט ללא תלויות: מריץ job בשעה קבועה בכל יום (שעון מקומי) */

export function parseTime(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
  if (!m) throw new Error(`SEND_TIME לא תקין: "${hhmm}" (הפורמט הנדרש: HH:MM)`);
  const [h, min] = [Number(m[1]), Number(m[2])];
  if (h > 23 || min > 59) throw new Error(`SEND_TIME מחוץ לטווח: "${hhmm}"`);
  return { hours: h, minutes: min };
}

export function nextRunAt(hhmm, from = new Date()) {
  const { hours, minutes } = parseTime(hhmm);
  const next = new Date(from);
  next.setHours(hours, minutes, 0, 0);
  if (next <= from) next.setDate(next.getDate() + 1);
  return next;
}

export function startDailySchedule(hhmm, job) {
  const tick = async () => {
    const at = nextRunAt(hhmm);
    console.log(`⏰ הריצה הבאה: ${at.toLocaleString()}`);
    setTimeout(async () => {
      try {
        await job();
      } catch (err) {
        console.error(`❌ הריצה נכשלה: ${err.message}`);
      }
      tick(); // מתזמנים מחדש בכל מקרה, גם אחרי כישלון
    }, at - Date.now());
  };
  tick();
}

/**
 * המרחק בדקות בין "עכשיו" לשעת השליחה (מרחק מעגלי, מקסימום 720).
 * משמש את --guard-time: ה-cron של GitHub Actions רץ ב-UTC ולא מכיר שעון קיץ,
 * ולכן מריצים אותו בשתי שעות אפשריות ורק זו שנופלת על השעה המקומית הנכונה שולחת.
 */
export function minutesFromSendTime(hhmm, now = new Date()) {
  const { hours, minutes } = parseTime(hhmm);
  const target = new Date(now);
  target.setHours(hours, minutes, 0, 0);
  const diff = Math.abs(now - target) / 60000;
  return Math.min(diff, 1440 - diff);
}
