# CLAUDE.md — EHN Competitor Outlier Lab

## The point of this project

Rohan runs **Elemental Health & Nutrition** (functional medicine clinic, Adelaide) and wants to
**grow his own social media engagement**. This repo is the instrument for doing that.

The strategy is not "post more." It's **reverse-engineer what's already working** in the
functional/integrative-medicine niche — across the biggest US accounts and the relevant AU
benchmarks — and then **adapt those winning patterns** into EHN's own Instagram + Facebook content.

So whenever you're working in this repo, the north star is:
> **Find the *style* of content that over-performs, explain *why*, and turn it into concrete
> things Rohan should post.** Better engagement for EHN is the deliverable — the dashboard is
> just the evidence base.

## The core idea: outlier score (read this first)

Raw likes are misleading — a 200k-follower account always beats a 5k one. So every post is scored
against **its own account's median engagement**:

```
outlier score = (likes + comments + shares) ÷ that account's median engagement
```

This normalises for audience size, so a small AU clinic post that beats its own norm shows up
**next to the giants**. The signal is *"this content over-performed for whoever made it"* — which
is exactly what's transferable.

**Tiers:** Breakout ≥4× · Replicable ≥2× · Working ≥1.3× · Normal below.
- **Replicable (≥2×) is the sweet spot.** Strong over-performers that aren't freak one-offs —
  this is the band to mine for patterns and model in EHN's content.
- **Breakout (≥4×)** is worth studying but often driven by something hard to copy (a viral moment,
  a huge announcement, a personal/emotional post). Note *why* before recommending it.

## The system (brief — full detail in README.md / apify-pipeline.md)

```
Apify scrapers (weekly)  →  2 Google Sheets (mode: replace)  →  published as CSV  →  index.html
 IG: apify/instagram-scraper        dashboard fetches both CSVs live, auto-detects platform
 FB: apify/facebook-posts-scraper   by column (ownerUsername=IG, pageName=FB), scores, ranks
```

- **Live dashboard:** https://speaktothewind.github.io/ehn-competitor-lab/ (index.html)
- **Weekly feed:** https://speaktothewind.github.io/ehn-competitor-lab/weekly-plan.json (v2 schema)
- **Repo:** https://github.com/speaktothewind/ehn-competitor-lab (public, GitHub Pages from main/root)

---

## Lab feeds, pipeline owns (LOCKED 2026-06-04)

This Lab is **a JSON feed generator, not a publisher and not a review surface.** The clinic SM
**pipeline (cockpit)** ingests the feed, runs GATE-1 dedupe, renders floor-locked creatives,
shows the single preview, gates, and publishes. Division of labour:

- **Lab (here) = generator.** Score over-performers → EHN-voice copy → `build_brief` +
  topic-agnostic `design_recipe` → publish `weekly-plan.json` + `weekly-patterns.json`. Nothing more.
- **Pipeline = owner.** Pulls the two published JSONs each **Thursday**; owns dedupe/render/preview/publish.
- **`plan.html` / local `:8787` is an internal render preview only — NOT the approval surface.**
  Rohan approves from the cockpit's `build_preview_page.py`, never from the Lab's render.
- The Lab **cannot publish** — `.env` holds only an `ANTHROPIC_API_KEY` (content generation), no Meta/GBP tokens.

**`weekly-plan.json` is schema v2** — each post carries routing metadata the cockpit consumes:
`pillar`, `day_fit`, `image_need` (none/still/footage), `face_branded`, `fb_text_only`,
`gbp_card_required`, per-surface (`instagram`/`facebook`/`googlebusiness`), `gate1_risk`,
and `recency_window` (for dashboard's 7-day "breakouts" lens).

**Locked render contract (baked into `extract.mjs` prompts + `render_constraints`):**
EHN palette only (#FAF8F5, #2D3436, #39B54A) · **Satoshi Bold** headings / Satoshi Medium body
(NOT Libre Caslon — benched) · legibility floors **≥36px / body ≥40px / heading ~95px** 
("shorten copy, never shrink font" — the renderer hard-asserts) · cards branded **"Elemental Health & Nutrition"**
(suburb keyword in GBP caption only) · **every post ships a GBP hook card** (incl. text-only) · AHPRA/TGA-safe.

**GATE-1:** keep `RECENT_EHN_TOPICS` in `extract.mjs` synced with the pipeline's `topic-log.md`;
recent topics are de-prioritised in selection and any that slip through are flagged `gate1_risk`.
The **format pivot** (winning archetypes replace the Pillow branded cards) is a *tracked experiment*
vs the branded-card baseline — if it loses, branded cards + Libre Caslon resume.

---

## Measurement loop (2026-06-05 onwards)

The Lab tracks which recipes/archetypes drive engagement via structured measurement infrastructure.

**Three attribution types are tracked distinctly:**
1. **Full recipe** — design recipe + copy reworked to EHN voice (clean 1:1 adoption)
2. **Archetype** — format pattern borrowed from Lab, different topic
3. **Format pattern** — general format from pivot library, EHN-original topic + copy

**Files:**
- `published-posts.json` — Maps 7 weekly posts to Lab attribution type + post URLs (filled on Sun when posts live)
- `recipe-performance.json` — Template for engagement results (filled +7 days post-publication, equal-age snapshots)
- `baseline-control.json` — 3 weeks of branded-card control (05-18, 05-25, 06-01) for experiment comparison
- `MEASUREMENT-LOOP.md` — Full process doc (read this for detailed workflow)

**Weekly cycle:**
- **Sun (week fires Mon–Sun):** Lab receives post URLs from pipeline's Zernio pull, commits to `published-posts.json`
- **Mon +7 days:** Pipeline snapshots engagement per post (equal-age, stable baseline vs candidate lookback)
- **Mon +7 days:** Pipeline backfills baseline weeks (05-18/25, 06-01) with same method
- **Thu +9 days:** Lab analyzes results, directional weighting (low-confidence flag), no GATE-1/lock override

**Decision rule:** Pivot must beat branded-card baseline to justify permanence. Rohan's call, logged in decisions/log.md.

---

## Dashboard: 7-day recency lens (2026-06-05)

The competitor dashboard now supports filtering by post age without sacrificing statistical rigor.

**How it works:**
- **Candidate window is filterable:** 7-day "breakouts" | 30-day "proven" | All (default)
- **Baseline median stays stable:** 30-90d rolling (unchanged)
- **No noise:** Only the CANDIDATE pool becomes filterable; baseline doesn't shrink

**Why:** Timely trend-jacks (posts that popped this week are culturally live) vs reliable patterns (proven 30-day winners).
Each weekly-plan.json post is tagged `recency_window` ("7d" | "30d") so the pipeline preview can flag age.

---

## Conventions & gotchas

- **The dashboard is one file:** `index.html` (HTML + CSS + JS inline). Scoring/mapping logic lives
  in `compute()`, `mapIG()`, `mapFB()`, `mapRow()`. Recency filtering in `filtered()`.
- **The generator is one file:** `extract.mjs` (Node.js). Routes winners through vision classification,
  text drafting, pillar/format routing, and recency calculation. Core functions exported for reuse.
- **Ship changes:** `git add -A && git commit -m "..." && git push` → Pages redeploys in ~1 min.
  End commit messages with the `Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>` trailer.
- **The two CSV feeds are swapped** (the "IG" URL serves FB data and vice versa). This is harmless —
  `mapRow()` detects platform by column, not by feed order. Don't "fix" it by reordering URLs.
- **The offline snapshot (`DATA_RAW`) is currently empty** — the live fetch is the real data source
  and works on the hosted site. If you ever need a true offline fallback, regenerate `DATA_RAW`
  cleanly from a live CSV pull (don't hand-type it). Verified live: header reads "Live · <date>".
- **Voice for any content output:** clinician-credible, warm, plain-English, Australian spelling.
  Model the *structure* of competitor winners (hooks, formats), not their supplement-sales tone.

---

## Files in this folder

| File | What it is |
|------|------------|
| `index.html` | Live dashboard. 7-day recency filter + tier filters + search. Self-contained. |
| `plan.html` | Internal week plan preview. Do not use as approval surface (cockpit owns that). |
| `extract.mjs` | Weekly generator. Scores, classifies, drafts, routes, calculates recency_window. Exports routeOf() / slideCountOf() / daysSincePost() / recencyWindowOf(). |
| `apply-routing.mjs` | Reusable v2 back-filler for existing feeds (idempotent). |
| `weekly-plan.json` | Published feed: 10 ready-to-pick posts with routing metadata + recency_window. Schema v2. |
| `weekly-patterns.json` | Published feed: raw winners + trending rollups. Scored candidates. |
| `published-posts.json` | Measurement: maps 7 weekly posts to Lab attribution type + post URLs. |
| `recipe-performance.json` | Measurement: template for engagement results (filled +7 days post-publication). |
| `baseline-control.json` | Measurement: branded-card control weeks (05-18, 05-25, 06-01) for experiment comparison. |
| `MEASUREMENT-LOOP.md` | Process doc: full weekly attribution → engagement workflow. |
| `README.md` | User-facing: how the system works, tracked accounts, setup steps. |
| `apify-pipeline.md` | Technical: Apify scraper configs, Sheets integration, field mappings. |
| `.env` | Secret: `ANTHROPIC_API_KEY` only (content generation, no publishing). |

---

## Running the Lab

**Live feed (automatic):** GitHub Pages redeploys on push to main.

**Weekly generation (manual):**
```bash
ANTHROPIC_API_KEY=sk-... node extract.mjs
```
Outputs: `weekly-plan.json` (10 posts) + `weekly-patterns.json` (all winners).
DRY mode (no API key): scores + format tags, AI fields null.

**Back-fill v2 routing (one-time or as-needed):**
```bash
node apply-routing.mjs
```
Idempotent. Re-applies routing metadata to existing feeds without re-scoring.

---

## Next steps

1. **Thursday pull (pipeline):** Fetch live feed URLs from `published-posts.json` at run time.
2. **Sun +0:** Lab receives Zernio post URLs from pipeline, commits to `published-posts.json`.
3. **Mon +7:** Pipeline snapshots engagement (equal-age), backfills baseline weeks, populates `recipe-performance.json`.
4. **Thu +9:** Lab analyzes results, weights next week's recipe selection.

Measurement loop is fully staged. Ready for execution starting 2026-06-08.
