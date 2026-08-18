# 📜 היום בהיסטוריה — בוט טלגרם / דיסקורד

בוט ששולח כל בוקר עובדה היסטורית שקרתה בתאריך הזה, כולל **תמונה**, **תקציר קצר** ו**קישור לקריאה נוספת** בוויקיפדיה.

* ✅ **ללא תלויות חיצוניות** — Node.js בלבד (`fetch` מובנה, טעינת `.env` מובנית). אין `npm install`.
* ✅ **חינם לגמרי** — ה-API הפתוח של ויקיפדיה/ויקימדיה, בלי מפתחות ובלי הרשמה.
* ✅ **טלגרם ודיסקורד** — אפשר אחד מהם או שניהם במקביל.
* ✅ **עברית ואנגלית** (ועוד שפות), עם הימנעות מחזרה על עובדות שכבר נשלחו.

---

## התקנה מהירה

```bash
cp .env.example .env
```

מלאו ב-`.env` את פרטי היעד (טלגרם ו/או דיסקורד) — ההוראות בתוך הקובץ — ואז:

```bash
node src/index.js --dry-run
```

זה מדפיס תצוגה מקדימה בטרמינל בלי לשלוח כלום. אם זה נראה טוב:

```bash
node src/index.js --now
```

## הרצה יומית

שתי אפשרויות:

**א. המתזמן המובנה** (מתאים לשרת / מחשב שדולק תמיד):

```bash
node src/index.js --schedule
```

**ב. Task Scheduler של Windows** (מומלץ — לא צריך חלון פתוח, שורד אתחול):

```bash
powershell -ExecutionPolicy Bypass -File scripts\install-windows-task.ps1 -Time 08:00
```

בלינוקס, שורת crontab שקולה:

```bash
0 8 * * * cd /path/to/history_today && /usr/bin/node src/index.js --now >> bot.log 2>&1
```

## הרצה על שרת: GitHub Actions

הדרך המומלצת - חינמית, בלי שרת לתחזק, ורצה גם כשהמחשב שלך כבוי. הקובץ [`.github/workflows/daily.yml`](.github/workflows/daily.yml) כבר מוכן.

**1. צרו repo ודחפו:**

```bash
git remote add origin https://github.com/<USER>/history-today-bot.git
git push -u origin main
```

**2. הגדירו Secrets** ב-`Settings -> Secrets and variables -> Actions -> New repository secret`:

| Secret | ערך |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | הטוקן מ-@BotFather |
| `TELEGRAM_CHAT_ID` | המזהה מ-`scripts/find-chat-id.mjs` |
| `DISCORD_WEBHOOK_URL` | כתובת ה-webhook |

אופציונלי, בלשונית `Variables` (לא סודי): `TZ`, `WIKI_LANG`, `SEND_TIME`, `CATEGORY`.

**3. בדקו** בלשונית `Actions` -> `daily-history` -> `Run workflow`. יש שם תיבת `dry_run` להרצה יבשה בלי לשלוח.

### שעון קיץ - הבעיה והפתרון

ה-cron של GitHub Actions רץ ב-**UTC בלבד** ואינו מכיר שעון קיץ. 08:00 בישראל הוא 05:00 UTC בקיץ ו-06:00 UTC בחורף. לכן ה-workflow רץ **בשתי השעות**, והדגל `--guard-time` מוודא שרק ההרצה שנופלת בתוך חלון של 55 דקות סביב `SEND_TIME` המקומי באמת שולחת - השנייה מדלגת ויוצאת בהצלחה.

בנוסף, GitHub לא מבטיח דיוק בשעה: בשעות עומס ההרצה עלולה להתעכב ב-5-15 דקות. החלון של 55 דקות סופג את זה.

### שמירת ההיסטוריה

`data/sent.json` נשמר חזרה ל-repo בסוף כל הרצה (`permissions: contents: write`), כדי שמניעת החזרות תעבוד גם בין הרצות. זו הסיבה ש-`.gitignore` מחריג אותו במפורש.

## פקודות

| פקודה | מה היא עושה |
| --- | --- |
| `node src/index.js --dry-run` | תצוגה מקדימה בטרמינל, בלי שליחה |
| `node src/index.js --now` | שולח עכשיו לכל היעדים המוגדרים |
| `node src/index.js --schedule` | מריץ ברקע ושולח כל יום בשעה שהוגדרה |
| `node src/index.js --check` | בודק שהטוקנים והיעדים תקינים |
| `node src/index.js --help` | עזרה |
| `node scripts/find-chat-id.mjs` | מוצא את ה-`TELEGRAM_CHAT_ID` הנכון |

דגלים נוספים: `--date=2026-05-14`, `--lang=en`, `--category=births|deaths|events`, `--only=telegram|discord`.

## פתרון תקלות

**`Forbidden: the bot can't send messages to the bot`** — ה-`TELEGRAM_CHAT_ID` שהוגדר הוא ה-ID של הבוט עצמו (המספר שלפני הנקודתיים בטוקן). צריך את ה-ID של היעד: שלחו לבוט הודעה בטלגרם והריצו `node scripts/find-chat-id.mjs`.

**`chat not found`** — הבוט לא מכיר את הצ'אט. בצ'אט אישי צריך ללחוץ Start; בערוץ או קבוצה צריך להוסיף את הבוט כאדמין.

## הגדרות (`.env`)

| משתנה | ברירת מחדל | הסבר |
| --- | --- | --- |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | — | יעד טלגרם (מ-@BotFather) |
| `DISCORD_WEBHOOK_URL` | — | יעד דיסקורד (Webhook של ערוץ) |
| `WIKI_LANG` | `he` | שפת התוכן |
| `SEND_TIME` | `08:00` | שעת השליחה היומית (שעון מקומי) |
| `CATEGORY` | `events` | אירועים / לידות / פטירות |
| `NO_REPEAT_DAYS` | `365` | טווח שבו לא חוזרים על אותה עובדה |
| `TZ` | של המערכת | אזור זמן. **חובה על שרת** - ברירת המחדל שם היא UTC |

## איך זה עובד

```
src/
├── index.js            CLI: dry-run / now / schedule / check
├── config.js           קריאת .env והגדרות
├── fact.js             בחירת העובדה היומית + השלמת תמונה, מניעת חזרות
├── format.js           עיצוב ההודעה (טלגרם HTML / Discord embed / טרמינל)
├── scheduler.js        מתזמן יומי ללא תלויות
├── history-log.js      data/sent.json — מה כבר נשלח
├── http.js             fetch עם User-Agent, timeout ו-retry
├── sources/
│   ├── feed.js         Wikimedia "On this day" API (en, de, fr, es, ru, ar…)
│   └── hebrew.js       עברית: פירוק עמוד התאריך בוויקיפדיה העברית
└── senders/
    ├── telegram.js     sendPhoto / sendMessage (Bot API)
    └── discord.js      Webhook עם embed
```

**למה שני מקורות?** ה-API הרשמי [`On this day`](https://api.wikimedia.org/wiki/Feed_API/On_this_day) של ויקימדיה נוח ומובנה, אבל **לא תומך בעברית** (מחזיר 404). לכן במצב עברית הבוט קורא את עמוד התאריך בוויקיפדיה העברית (למשל "18 באוגוסט") דרך ה-`action API`, מפרק את סעיף האירועים, ומשלים תמונה, תקציר וקישור דרך `REST summary` של הערך המקושר. הכול חינמי ובלי מפתח.

בחירת העובדה: מסננים אירועים שכבר נשלחו לאחרונה, מגרילים סדר אקראי, ומעדיפים אירוע שיש לו ערך ויקיפדיה עם תמונה. אם אין תמונה בכלל — נשלחת הודעת טקסט עם הקישור.

## הערות

* ויקיפדיה דורשת `User-Agent` מזהה. מומלץ להגדיר `USER_AGENT` ב-`.env` עם כתובת מייל, בהתאם ל[מדיניות השימוש](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy).
* בטלגרם, אם שליחת התמונה נכשלת (קורה מדי פעם עם קבצים גדולים ב-Wikimedia) — הבוט נופל אוטומטית לשליחת טקסט עם תצוגה מקדימה של הקישור.
* `data/sent.json` נוצר אוטומטית. בהרצה מקומית הוא פשוט קובץ; ב-GitHub Actions הוא נשמר ב-repo כדי שמניעת החזרות תשרוד בין הרצות.
* ה-`.env` לעולם לא נכנס ל-git. ב-GitHub Actions הסודות מגיעים מ-Secrets והקובץ פשוט לא קיים שם.
