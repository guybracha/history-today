#!/usr/bin/env node
import { config, assertHasTarget } from './config.js';
import { pickFact } from './fact.js';
import { consolePreview } from './format.js';
import { remember } from './history-log.js';
import * as telegram from './senders/telegram.js';
import * as discord from './senders/discord.js';
import { startDailySchedule, minutesFromSendTime } from './scheduler.js';

function parseArgs(argv) {
  const args = { _: [] };
  for (const a of argv) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (m) args[m[1]] = m[2] ?? true;
    else args._.push(a);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

function targetDate() {
  if (!args.date || args.date === true) return new Date();
  const d = new Date(`${args.date}T12:00:00`);
  if (Number.isNaN(d.getTime())) throw new Error(`--date לא תקין: ${args.date} (צפוי YYYY-MM-DD)`);
  return d;
}

async function buildFact() {
  return pickFact({
    date: targetDate(),
    lang: args.lang && args.lang !== true ? String(args.lang) : config.lang,
    category: args.category && args.category !== true ? String(args.category) : config.category,
  });
}

async function sendOnce() {
  assertHasTarget();
  const only = args.only && args.only !== true ? String(args.only).toLowerCase() : null;
  if (only && !['telegram', 'discord'].includes(only)) {
    throw new Error(`--only לא תקין: ${only} (telegram או discord)`);
  }
  const fact = await buildFact();
  console.log(consolePreview(fact));

  const results = await Promise.allSettled([
    config.telegram.enabled && only !== 'discord' ? telegram.send(fact) : null,
    config.discord.enabled && only !== 'telegram' ? discord.send(fact) : null,
  ]);

  const names = ['Telegram', 'Discord'];
  let sent = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      console.log(`✅ נשלח ל-${names[i]}`);
      sent++;
    } else if (r.status === 'rejected') {
      console.error(`❌ ${names[i]}: ${r.reason.message}`);
    }
  });

  if (sent) remember(fact);
  else throw new Error('אף הודעה לא נשלחה');
  return fact;
}

const HELP = `
📜 היום בהיסטוריה — בוט טלגרם/דיסקורד

שימוש:
  node src/index.js --dry-run          תצוגה מקדימה בטרמינל, בלי לשלוח
  node src/index.js --now              שולח עכשיו ליעדים המוגדרים
  node src/index.js --schedule         מריץ ברקע ושולח כל יום בשעה ${config.sendTime}
  node src/index.js --check            בדיקת חיבור ליעדים

אפשרויות:
  --date=YYYY-MM-DD   תאריך אחר (ברירת מחדל: היום)
  --lang=he|en|...    שפה (ברירת מחדל: ${config.lang})
  --category=events|births|deaths
  --only=telegram|discord   שליחה ליעד אחד בלבד
  --guard-time[=דקות]       שולח רק אם השעה המקומית קרובה ל-SEND_TIME (ל-cron ב-UTC)
`;

try {
  if (args.help || args.h) {
    console.log(HELP);
  } else if (args.check) {
    assertHasTarget();
    if (config.telegram.enabled) console.log('✅ ' + (await telegram.verify()));
    if (config.discord.enabled) console.log('✅ Discord: webhook מוגדר');
    console.log(`ℹ️  שפה: ${config.lang} | שעת שליחה: ${config.sendTime} | אזור זמן: ${config.timezone} (${new Date().toLocaleString()})`);
  } else if (args.now || args.send) {
    // --guard-time: שולח רק אם השעה המקומית קרובה ל-SEND_TIME.
    // נועד ל-cron של GitHub Actions, שרץ ב-UTC ולא מכיר שעון קיץ.
    const window = Number(args['guard-time'] === true ? 55 : args['guard-time']);
    if (args['guard-time'] && minutesFromSendTime(config.sendTime) > window) {
      console.log(
        `⏭️  מדלג: השעה כעת ${new Date().toLocaleTimeString()} (${config.timezone}), ` +
          `שעת השליחה היא ${config.sendTime}. ההרצה השנייה של היום תשלח.`
      );
    } else {
      await sendOnce();
    }
  } else if (args.schedule) {
    assertHasTarget();
    console.log(`🤖 הבוט פועל. שליחה יומית בשעה ${config.sendTime} (${config.timezone}).`);
    startDailySchedule(config.sendTime, sendOnce);
  } else {
    // ברירת מחדל: תצוגה מקדימה בטוחה
    console.log(consolePreview(await buildFact()));
    if (!args['dry-run']) console.log('\nℹ️  זו תצוגה מקדימה בלבד. לשליחה בפועל: node src/index.js --now');
  }
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exitCode = 1;
}
