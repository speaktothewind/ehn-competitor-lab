# Weekly pattern extractor

Headless twin of `index.html`. Turns the same two live CSV feeds into one structured
`weekly-patterns.json` the content pipeline can ingest — every over-performer scored,
bucketed, and tagged by **hook / topic / register + a reproducible visual recipe**.

```
Apify (Mon ~7am)  →  2 Google Sheets CSVs  →  extract.mjs (Tue, GitHub Action)  →  weekly-patterns.json
                                                fetch · score · dedupe · stratify · Claude vision tag
```

## What it does

1. **Fetch** both published CSVs (same URLs as the dashboard).
2. **Score** with logic ported verbatim from `index.html` — `outlier = engagement ÷ account median` —
   so numbers track the dashboard, with two deliberate corrections (see *Divergences*).
3. **Select** over-performers (≥2×), **stratified by bucket** so AU isn't buried under US
   median-artefact extremes, capped per account so one page can't define a bucket.
4. **Classify** each selected winner with Claude (vision): fetches the post image and returns
   forced-choice `hook` / `topic` / `register`, `has_face` / `is_text_card`, and a `visual_recipe`.
5. **Write** `weekly-patterns.json`: per-winner tags + `trending` rollups (competitors, AU-only,
   format-school) the pipeline reads.

The CDN image URLs in the feed are **signed and expire in hours-to-days**, so the vision step
runs in the same job right after the refresh. The durable artifact is the recipe text, not the URL.

## Buckets

| Bucket | What it is | Use it for |
|---|---|---|
| `AU-competitor` | Tracked AU clinics/practitioners | Same-market signal — **weight heavily** |
| `US/other` | US/international niche accounts | Aspirational reach patterns |
| `format-school` | Out-of-niche format exemplars (Huberman, IDriss…) | **Format** modelling only, not topic |
| `YOU` | EHN's own accounts | Your baseline vs competitors |

## Output shape (`weekly-patterns.json`)

```jsonc
{
  "week": "2026-06-03",
  "counts": { "posts_scored": 1635, "overperformers_2x": 406, "classified_by_bucket": {…} },
  "trending":     { "hook": {…}, "topic": {…}, "format": {…}, "faceless_share": 0.4 }, // AU+US competitors
  "trending_au":  { … },   // AU only — the same-market read
  "format_school_signal": { … }, // format exemplars
  "winners": [
    {
      "account": "stevenjudgenaturopath", "bucket": "AU-competitor", "region": "au",
      "platform": "instagram", "score": 10.78, "tier": "breakout", "format": "carousel",
      "hook": "myth-bust", "topic": "gut/SIBO", "register": "validation",
      "has_face": false, "is_text_card": true,
      "visual_recipe": "Plain text-on-cream card, ~8 words, bold sans filling ~55% of frame…",
      "dominant_colors": ["#F3ECE0", "#2B2B2B"], "text_word_count_est": 8,
      "exemplar": "You don't have a willpower problem…", "url": "…",
      "image_url": "…(expires)…", "timestamp": "2026-05-29"
    }
  ]
}
```

## Wiring into the Perplexity pipeline

Perplexity = **discovery** (what topics are bubbling). This tool = **validation** (what over-performed
in your niche, and what it looked like). They stack:

- **Topic steering** — `trending.topic` / `trending_au.topic` bias topic selection toward proven demand.
- **Hook + format + visual steering** — for whatever topic you pick, `trending.hook` + `format` +
  the matching winner's `visual_recipe` tell you *how to package it* (adapted to a clinician voice).
- **Faceless filter** — filter `winners` to `is_text_card || has_face === false` to mine only the
  formats you'll actually make (the Steven Judge play). `faceless_share` tells you how much of the
  winning band is faceless.

Pull it from the raw GitHub URL once a week:
`https://raw.githubusercontent.com/speaktothewind/ehn-competitor-lab/main/weekly-patterns.json`

## Run it

```bash
npm install
ANTHROPIC_API_KEY=sk-ant-… node extract.mjs   # full run with vision recipes
node extract.mjs                               # DRY: scoring + format tags only, AI fields null
```

**CI:** runs weekly via `.github/workflows/weekly-patterns.yml` and commits the JSON.
One-time setup: add repo secret **`ANTHROPIC_API_KEY`** (Settings → Secrets → Actions).
Without it the Action still runs but produces a dry file (no recipes).

## Config (top of `extract.mjs`)

- `ALLOC` — per-bucket vision slots (default AU 18 · US 16 · format-school 8 · YOU 6).
- `MAX_PER_ACCOUNT` — cap winners per account within a bucket (default 3).
- `MODEL` — `claude-haiku-4-5` (vision-capable, ~cents/run).

## Scoring corrections

1. **`likes:-1` excluded** (per `CLAUDE.md`). Hidden-metrics posts are dropped from scoring instead of
   kept as `-1` (which deflates medians and inflates scores). **The dashboard is kept in sync** — the
   same one-line filter is in `index.html`'s `normalize()`.
2. **Confidence floor (`MIN_MEDIAN = 10`).** Below this account median, a "2× outlier" is ~20
   interactions of noise — overwhelmingly near-dead Facebook mirror pages (EHN FB median ~0.5; several
   AU FB mirrors 0–8). Such winners are kept and flagged `low_confidence`, but **excluded from the
   `trending` rollups** and de-prioritised for the vision budget. The floor sits above real small AU
   accounts (Steven Judge median ~24) and below the dead pages. *(Extractor only — the dashboard still
   displays everything; ask if you want the floor surfaced there too.)*
3. **Stratified + per-account-capped selection** (`MAX_PER_ACCOUNT = 3`) for the vision set — so one
   low-median page can't define a bucket's pattern signal.
