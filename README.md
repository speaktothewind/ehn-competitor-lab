# EHN Competitor Outlier Lab

A self-updating dashboard that tracks competitor Instagram + Facebook post engagement in the functional / integrative medicine niche, and surfaces high-performing "outlier" posts worth emulating. Built for Elemental Health & Nutrition (Rohan Smith, Adelaide).

**Live dashboard:** https://speaktothewind.github.io/ehn-competitor-lab/

---

## What it does

Scrapes the last 30 days of posts from a locked list of competitor accounts across both platforms, scores every post against **its own account's median engagement**, and ranks the results. A small account beating its own norm shows up next to the giants, so the signal is "what content is over-performing," not just "who is biggest."

**Outlier score** = post engagement (likes + comments + shares) ÷ that account's median.
**Tiers:** Breakout ≥4× · Replicable ≥2× · Working ≥1.3× · Normal below.
The **Replicable** band (≥2×) is the sweet spot — strong over-performers that aren't freak one-offs.

---

## The pipeline (end to end)

```
Apify scrapers (weekly)          Google Sheets            This dashboard
-----------------------          -------------            --------------
Instagram Scraper  --\                                    fetches both published
(directUrls)          >--> writes raw posts  -->  CSVs on load, auto-detects
Facebook Scraper   --/    to two Sheets           IG vs FB, scores, ranks
(startUrls)               (mode: replace)          (snapshot fallback if fetch fails)
                          published as CSV
                          (to web)
```

- **Scrapers:** `apify/instagram-scraper` (via `directUrls`) and `apify/facebook-posts-scraper` (via `startUrls`), both set to `onlyPostsNewerThan: "30 days"`.
- **Sheets bridge:** the `lukaskrivka/google-sheets` actor ("Google Sheets Import & Export"), **mode = replace** (wipes + rewrites each run, so no duplicate build-up).
- **Publish:** each Sheet is published to the web as CSV (File → Share → Publish to web → CSV).
- **Dashboard:** reads both published CSVs live, infers platform from the columns (so URL order doesn't matter), maps raw scraper fields, computes scores, renders.

### Live CSV URLs (already wired into index.html)
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vSrxfB_2zHHAthnBrGiyTvHp0Rg-zQ3lYCZZ02lO4cNtuDyk32B54IWCpUrNkMpRyJfA7ehXz8hpeG2/pub?output=csv
https://docs.google.com/spreadsheets/d/e/2PACX-1vSrLbTQLJGNH9YAe2Cc3YAf_rfi0vylFGb7a00RwQVdimRO9J0vC7G3YvEoSRv_b-RDww_uk-Hvwudh/pub?output=csv
```
They live in a `const CSV_URLS = [...]` array near the top of the `<script>` in `index.html`. To change feeds later, edit that array — order is irrelevant (auto-detected).

---

## Tracked accounts

**US / International (emulation targets):** drmarkhyman, drchatterjee, drwillcole, theguthealthmd, drpedre, davidperlmutter, doc_amen (Daniel Amen), drbenlynch, drkarafitzgerald, drjoshaxe, drumanaidoo (Uma Naidoo), drcaseyskitchen (Casey Means — IG only), chriskresser.

**Australian benchmarks:** functionalmedicineau (Advanced Functional Medicine), stevenjudgenaturopath, theshiftclinic, melbournefxmed (IG only), mthfrsupportglobal (largest AU in-niche, ~18K FB / ~5K IG), drdenisefurness (IG only).

**Own accounts (tagged YOU in the dashboard):** elemental_health_nutrition (IG), elementalhealthandnutrition (FB).

Field mappings, exact handles, and the full scraper config blocks are in **apify-pipeline.md**.

---

## Files in this folder

| File | What it is |
|------|------------|
| `index.html` | The dashboard. Self-contained (uses PapaParse from CDN). Open in a browser. |
| `apify-pipeline.md` | Full Apify setup: scraper configs, IG/FB field mappings, Sheets integration steps, locked account list. |
| `README.md` | This file. |

---

## Current status

**Done:**
- Both scrapers built and confirmed pulling real data (449 IG + 421 FB posts in last test).
- Sheets integration working (`lukaskrivka/google-sheets`, mode = replace), both Sheets publishing as CSV.
- Dashboard built, dark "Outlier Lab" UI, sortable columns (click any header; Creator groups by account), tier/platform/region filters, search, cards view, YOU badge for own accounts.
- Live fetch wired to both published CSVs with auto-detect + snapshot fallback.
- Pushed to GitHub and published via GitHub Pages.

**Pending (the only manual step left):**
- Rohan must add his own handles to the live Apify tasks and trigger one run, or his accounts won't appear in the Sheets yet:
  - Instagram task — add `"https://instagram.com/elemental_health_nutrition"` to `directUrls`
  - Facebook task — add `{ "url": "https://facebook.com/elementalhealthandnutrition" }` to `startUrls`

---

## Maintenance

- **Editing the dashboard:** everything lives in `index.html` (HTML + CSS + JS in one file). Commit and push; GitHub Pages redeploys automatically within a minute or two.
- **Changing the data feeds:** edit the `CSV_URLS` array near the top of the `<script>`. Order is irrelevant — platform is auto-detected from the columns.
- **Re-publishing:** `git add -A && git commit -m "..." && git push`. Pages picks it up.

### Optional polish (only if needed)
- **Account whitelist:** the live feed currently shows ~42 accounts (the scrapers picked up a few tagged/collaborator pages beyond the ~30 tracked). To restrict to only tracked accounts, add a whitelist array in `index.html` and filter `normalize()` against it.
- **Rename swapped Sheets:** the two source Sheets were historically mislabelled (the "Instagram"-named one held FB data and vice versa). The dashboard auto-detects by columns so this is cosmetic, but renaming avoids future confusion.

---

## Notes / gotchas

- **Hosting matters for live fetch.** Opened as a local `file://`, the browser may block the cross-origin fetch to Google (CORS) and the dashboard falls back to its embedded snapshot. Hosting on GitHub Pages (or WordPress) resolves this — Google's published-to-web CSVs send permissive CORS headers.
- **Replace mode keeps Sheets lean.** Each run wipes and rewrites, so the Sheet never accumulates duplicates and stays well under Google's 10M-cell limit even with the wide raw FB export (~2,000 columns).
- **The dashboard reads raw scraper columns directly** — no field trimming required in the Sheets. Mapping logic is in `mapIG()` / `mapFB()` in `index.html`.
- **Embedded snapshot:** `index.html` carries an 870-post snapshot as `DATA_RAW` so it always renders something even offline. Live data overrides it when the fetch succeeds.
