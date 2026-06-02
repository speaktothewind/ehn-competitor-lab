# Apify → Google Sheets → Dashboard — Full Setup

Everything runs in **your** Apify account. The pipeline has two parts:

- **Tracking** — scrape the locked accounts every week (last 30 days of posts).
- **Discovery** — a hashtag scan to surface any bigger account you've missed.

Both write to one Google Sheet that the dashboard reads and self-refreshes from.

---

## Step-by-step (do this once)

**1. Log in** at apify.com. The free plan includes ~$5/month of credits — plenty to test these runs.

**2. Instagram scraper.** Apify Store → open **Instagram Scraper** (`apify/instagram-scraper`). Switch the input to **JSON**, paste the Instagram block from *Part 1* below, hit **Start**. Check the **Storage / Output** tab to confirm you're getting posts with likes and comments.

**3. Save as a Task.** Top-right ··· → **Save as task** → name it "EHN — Instagram". Tasks remember the input and can be scheduled.

**4. Facebook scraper.** Repeat 2–3 with **Facebook Posts Scraper** (`apify/facebook-posts-scraper`) using your Page URLs. Save as "EHN — Facebook".

**5. Pipe to Sheets.** Open a task → **Integrations** tab → add **Google Sheets** → connect Google → pick your sheet + matching tab → mode **Replace**. Do it for both tasks (Instagram tab / Facebook tab).

**6. Schedule.** Left menu → **Schedules** → **Create** → weekly cron (e.g. Monday 7am) → attach both tasks. It now refreshes itself.

**7. Connect the dashboard.** In the Sheet: File → Share → **Publish to web** → CSV → copy the link → paste it into the `SHEET_CSV_URL` line near the top of the dashboard file. Live.

> **First-run tip:** run the Instagram scraper once before scheduling, look at the output columns, and map them to the schema below. The raw field names (`ownerUsername`, `likesCount`…) won't match the dashboard's columns (`account`, `likes`…) out of the box — see *Field mapping*.

---

## Google Sheet

1. New Google Sheet — e.g. **"EHN Competitor Tracking"** — with tabs: `instagram`, `facebook`.
2. Header row on each tab (must match the dashboard exactly):
   `platform | region | account | followers | url | type | caption | timestamp | likes | comments | shares | views | scraped_at`
3. File → Share → **Publish to web** → pick the tab → **CSV** → copy the link → paste into the dashboard's `SHEET_CSV_URL`.

---

## Part 1 — Tracking (last 30 days)

**Instagram task** — `apify/instagram-scraper`
```json
{
  "directUrls": [
    "https://instagram.com/drmarkhyman",
    "https://instagram.com/drchatterjee",
    "https://instagram.com/drwillcole",
    "https://instagram.com/theguthealthmd",
    "https://instagram.com/drpedre",
    "https://instagram.com/davidperlmutter",
    "https://instagram.com/doc_amen",
    "https://instagram.com/drbenlynch",
    "https://instagram.com/drkarafitzgerald",
    "https://instagram.com/drjoshaxe",
    "https://instagram.com/drumanaidoo",
    "https://instagram.com/drcaseyskitchen",
    "https://instagram.com/chriskresser",
    "https://instagram.com/functionalmedicineau",
    "https://instagram.com/stevenjudgenaturopath",
    "https://instagram.com/theshiftclinic",
    "https://instagram.com/melbournefxmed",
    "https://instagram.com/mthfrsupportglobal",
    "https://instagram.com/elemental_health_nutrition",
    "https://instagram.com/drdenisefurness"
  ],
  "resultsType": "posts",
  "onlyPostsNewerThan": "30 days",
  "resultsLimit": 50
}
```

**Facebook task** — `apify/facebook-posts-scraper`
```json
{
  "startUrls": [
    { "url": "https://facebook.com/drmarkhyman" },
    { "url": "https://facebook.com/DrChatterjee" },
    { "url": "https://facebook.com/doctorwillcole" },
    { "url": "https://facebook.com/theguthealthmd" },
    { "url": "https://facebook.com/DrVincentPedre" },
    { "url": "https://facebook.com/DavidPerlmutterMd" },
    { "url": "https://facebook.com/drdanielamen" },
    { "url": "https://facebook.com/drbenjaminlynch" },
    { "url": "https://facebook.com/DrKaraFitzgerald" },
    { "url": "https://facebook.com/DrJoshAxe" },
    { "url": "https://facebook.com/DrUmaNaidoo" },
    { "url": "https://facebook.com/chriskresserlac" },
    { "url": "https://facebook.com/advancedfunctionalmedicine" },
    { "url": "https://facebook.com/stevenjudgenaturopath" },
    { "url": "https://facebook.com/theshiftclinic" },
    { "url": "https://facebook.com/mthfrsupportglobal" },
    { "url": "https://facebook.com/elementalhealthandnutrition" }
  ],
  "onlyPostsNewerThan": "30 days",
  "resultsLimit": 50
}
```
Not on Facebook (run on Instagram only): **Casey Means** (no significant FB page) and **Denise Furness** (no clean public page handle — add manually if you find her exact URL).

**Handles confirmed:** Daniel Amen IG `doc_amen` / FB `drdanielamen`; The Shift Clinic (Katherine Maslen) IG `theshiftclinic` / FB `theshiftclinic`. Confirmed Facebook pages so far: facebook.com/drmarkhyman, /DrJoshAxe, /DrChatterjee, /chriskresserlac, /DrUmaNaidoo, /drdanielamen, /advancedfunctionalmedicine, /stevenjudgenaturopath, /theshiftclinic. (Casey Means has a Facebook presence but it's likely thin — verify on first run.)

---

## Part 2 — Discovery (find anyone bigger we missed)

**Step 1** — `apify/instagram-hashtag-scraper`
```json
{
  "hashtags": ["functionalmedicine","guthealth","SIBO","MTHFR","methylation",
               "chronicfatigue","leakygut","naturopath","naturopathaustralia",
               "clinicalnaturopath","holisticnutrition"],
  "resultsType": "posts",
  "resultsLimit": 200
}
```
**Step 2** — dedupe the `ownerUsername` values, feed them into `apify/instagram-profile-scraper` for `followersCount`, `biography`, `externalUrl`.

**Step 3** — keep accounts whose bio/link signals Australia (`.com.au`, or Sydney/Melbourne/Brisbane/Perth/Adelaide), sort by `followersCount`, drop anything under ~16k (your size). Sanity-check engagement, not just followers.

> Facebook hashtag discovery is unreliable — run discovery on Instagram, then open each surfaced account's Facebook page by hand. Run discovery monthly or on demand, not weekly.

---

## Field mapping (raw actor output → dashboard schema)

The Google Sheets integration writes the actor's raw fields. Map them to the schema columns:

| Dashboard column | Instagram actor | Facebook actor |
|---|---|---|
| account | `ownerUsername` | page name / `pageName` |
| caption | `caption` | `text` |
| url | `url` | `url` |
| type | `type` | `type` |
| timestamp | `timestamp` | `time` |
| likes | `likesCount` | `likes` |
| comments | `commentsCount` | `comments` |
| shares | — | `shares` |
| views | `videoViewCount` | `viewsCount` (videos only) |
| followers | `ownerFollowersCount`* | page likes/followers |

`platform`, `region` and `scraped_at` aren't in the raw output — set `platform` per task (Instagram vs Facebook), add `region` via an account→US/AU lookup, and use the run date for `scraped_at`.

\*Field names vary by actor version — verify against your first test run. Easiest path: paste the first run's column headers back to me and I'll either adjust the dashboard to read them directly, or hand you a short Google Apps Script that normalises into these columns automatically.

---

## Tracked accounts (locked)

**US / International (13):** drmarkhyman, drchatterjee, drwillcole, theguthealthmd, drpedre, davidperlmutter, Daniel Amen, drbenlynch, drkarafitzgerald, drjoshaxe, drumanaidoo (nutritional psychiatry / mood), drcaseyskitchen (Casey Means / metabolic), chriskresser (functional medicine).

**Australian benchmarks:** functionalmedicineau (Advanced Functional Medicine), stevenjudgenaturopath, theshiftclinic (Katherine Maslen's clinic — gut-focused, some women's/fertility content), melbournefxmed (Melbourne Functional Medicine — IG only here), mthfrsupportglobal (MTHFR Support / Carolyn Ledowsky — biggest AU account in-niche, ~18K FB / ~5K IG, methylation, fertility-heavy), drdenisefurness.

Once the scrape writes weekly, the dashboard's **Replicable / Breakout** tiers surface the posts beating each account's own baseline — your emulation targets.
