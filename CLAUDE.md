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

## How to actually use this for the goal

When Rohan asks "what's working", "what should I post", "how do I improve engagement", or similar,
don't just list posts. Run the analysis:

1. **Pull the over-performers.** Focus on Replicable + Breakout. The live data is in the two
   published Google Sheets CSVs (URLs in `index.html` / `README.md`); fetch and score the same way
   the dashboard does, or read the dashboard's logic in `index.html`.
2. **Cluster by pattern, not by account.** Group winners across these axes:
   - **Hook type** — contrarian ("you've been told X, it's wrong"), myth-bust, listicle,
     personal story, question/engagement-bait, data/stat drop, "comment WORD and I'll DM you".
   - **Format** — Reel/video vs carousel/Sidecar vs single image; talking-head vs text-on-screen.
   - **Topic** — gut health, hormones/perimenopause, thyroid, methylation/MTHFR, mental health,
     microplastics/toxins, walking/movement, fasting, lab interpretation, etc.
   - **Emotional register** — fear/urgency, hope, validation ("it's not your fault"), faith, humour.
3. **Quantify the pattern.** Which hook types / formats / topics show up most in the ≥2× band?
   Where's the consistent lift? That's the recommendation, backed by numbers.
4. **Compare to EHN's own baseline.** Rohan's accounts are tagged **YOU** in the dashboard
   (`elemental_health_nutrition` on IG, `elementalhealthandnutrition` on FB). What are his
   over-performers vs the competitors'? Where's the gap — format mix, hook strength, topic, cadence?
5. **Output specifics, not theory.** Give Rohan post ideas he could publish this week: the hook
   line, the format, the topic, and which competitor pattern it's modelled on. Adapt to a clinician
   voice — evidence-based, not hypey. EHN is a real clinic, not a supplement-pusher.

## What the data looks like (so analysis is honest)

- ~42 accounts, ~870 posts, rolling **last 30 days** (refreshes weekly via scheduled Apify runs).
- The ~42 is wider than the ~30 tracked accounts — scrapers pick up tagged/collaborator pages
  (e.g. `function`, `brainmdhealth`, `amen_clinics`, podcast accounts). Treat those as noise unless
  relevant; the locked tracked list is in `README.md` / `apify-pipeline.md`.
- **Views only exist for video.** Don't compare engagement *rates* across video vs image as if
  they're the same denominator — the outlier score uses likes+comments+shares, which is consistent.
- **`likes: -1`** in some rows means likes were hidden/unavailable on that post, not zero — exclude
  from like-based comparisons rather than treating as 0.
- Region tags: `us` = US/International (the aspirational reach targets), `au` = Australian
  benchmarks (the realistic, same-market comparison set — weight these heavily for Rohan).

## The system (brief — full detail in README.md / apify-pipeline.md)

```
Apify scrapers (weekly)  →  2 Google Sheets (mode: replace)  →  published as CSV  →  index.html
 IG: apify/instagram-scraper        dashboard fetches both CSVs live, auto-detects platform
 FB: apify/facebook-posts-scraper   by column (ownerUsername=IG, pageName=FB), scores, ranks
```

- **Live site:** https://speaktothewind.github.io/ehn-competitor-lab/
- **Repo:** https://github.com/speaktothewind/ehn-competitor-lab (public, GitHub Pages from main/root)

## Lab feeds, pipeline owns (LOCKED 2026-06-04)

This Lab is **a JSON feed, not a publisher and not a review surface.** The clinic SM
**pipeline (cockpit)** ingests the feed, runs GATE-1 dedupe, renders floor-locked creatives,
shows the single preview, gates, and publishes. Division of labour:

- **Lab (here) = generator.** Score over-performers → EHN-voice copy → `build_brief` +
  topic-agnostic `design_recipe` → publish `weekly-plan.json` + `weekly-patterns.json`. Nothing more.
- **Pipeline = owner.** Pulls the two published JSONs each **Thursday**; owns dedupe/render/preview/publish.
- **`posts-rendered.html` / local `:8787` is an internal sanity check only — NOT the approval surface.**
  Rohan approves from the cockpit's `build_preview_page.py`, never from the Lab's render.
- The Lab **cannot publish** — `.env` holds only an `ANTHROPIC_API_KEY` (content generation), no Meta/GBP tokens.

## Measurement loop (2026-06-05 onwards)

The Lab now tracks which recipes/archetypes drive engagement via `published-posts.json` and `recipe-performance.json`.

- **`published-posts.json`:** Maps 7 scheduled posts (Mon–Sun each week) to their Lab attribution type (full recipe / archetype / format pattern). Links to post URLs (filled in by Lab on Sun when all posts are live).
- **`recipe-performance.json`:** Template for engagement results (likes, comments, shares per post). Pipeline populates this 7+ days after posting, keyed by attribution type for signal clarity.
- **`MEASUREMENT-LOOP.md`:** Full process doc. Three attribution types tracked distinctly so measurement signal is clean: full recipe adoption, archetype borrowing (same format, different topic), and format pattern (EHN-original topic, general format from pivot library).

**Weekly cycle:** Lab pulls post URLs on Sun (week fires Mon–Sun). Pipeline pulls engagement data the following Thu (7+ days post-publication) and populates `recipe-performance.json`. Results feed back into next week's Lab recipe weighting (optional, post-implementation).

**`weekly-plan.json` is schema v2** — each post carries a `routing` block the cockpit consumes
(`pillar`, `day_fit`, `image_need` none/still/footage, `face_branded`, `fb_text_only`,
`gbp_card_required`, per-surface `instagram`/`facebook`/`googlebusiness`, `gate1_risk`) plus a
top-level `render_constraints` + `pillar_format_map`. Routing is derived in `routeOf()` /
`slideCountOf()` in `extract.mjs` (exported; `main()` is guarded so they import without firing a run).
`apply-routing.mjs` back-fills an existing feed to v2 without a live regen.

**Locked render contract (baked into `extract.mjs` prompts + `render_constraints`):**
EHN palette only · **Satoshi Bold** headings / Satoshi Medium body (NOT Libre Caslon — benched) ·
legibility floors **≥36px / body ≥40px / heading ~95px** ("shorten copy, never shrink font" — the
renderer hard-asserts) · cards branded **"Elemental Health & Nutrition"** (suburb keyword in GBP
caption only) · **every post ships a GBP hook card** (incl. text-only) · AHPRA/TGA-safe.

**GATE-1:** keep `RECENT_EHN_TOPICS` in `extract.mjs` synced with the pipeline's `topic-log.md`;
recent topics are de-prioritised in selection and any that slip through are flagged `gate1_risk`
(never silently dropped). The **format pivot** (winning archetypes replace the Pillow branded cards)
is a *tracked experiment* vs the branded-card baseline — if it loses, branded cards + Libre Caslon resume.

## Conventions & gotchas

- **The whole app is one file:** `index.html` (HTML + CSS + JS inline). Scoring/mapping logic lives
  in `compute()`, `mapIG()`, `mapFB()`, `mapRow()`. Edit there.
- **Ship changes:** `git add -A && git commit -m "..." && git push` → Pages redeploys in ~1 min.
  End commit messages with the `Co-Authored-By: Claude Opus 4.8 (1M context)` trailer.
- **The two CSV feeds are swapped** (the "IG" URL serves FB data and vice versa). This is harmless —
  `mapRow()` detects platform by column, not by feed order. Don't "fix" it by reordering URLs.
- **The offline snapshot (`DATA_RAW`) is currently empty** — the live fetch is the real data source
  and works on the hosted site. If you ever need a true offline fallback, regenerate `DATA_RAW`
  cleanly from a live CSV pull (don't hand-type it). Verified live: header reads "Live · <date>".
- **Voice for any content output:** clinician-credible, warm, plain-English, Australian spelling.
  Model the *structure* of competitor winners (hooks, formats), not their supplement-sales tone.
