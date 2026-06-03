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

## Two outputs

| File | What it is | Who reads it |
|---|---|---|
| `weekly-patterns.json` | Every classified winner + `trending` rollups (the raw signal) | the dashboard, analysis, the rollups below |
| `weekly-plan.json` | 10 ready-to-pick EHN posts, each modelled on a winner and rewritten in EHN voice | `plan.html`, **and the social-media pipeline at run time** |

## Wiring into the social-media pipeline

The Social Media Pipeline (`Content & Marketing/Social Media Pipeline/`) owns design + posting.
**Perplexity is just its research feed** (what topics are bubbling). This tool is a **second research
feed beside Perplexity at the topic-selection gate** — it adds *what already over-performed in the
niche, and what it looked like*. It does **not** replace the pipeline's creative stages.

**Seam:** the pipeline's EHN-social `topic-selection` stage fetches `weekly-plan.json` at run time and
presents its 10 posts alongside the Perplexity candidates. Each post is offered as **three
independently-selectable parts**, so Rohan can mix and match:

1. **Topic** — `topic` / `angle` (what the post is about).
2. **Advised text** — `caption` + `gmb_caption` + `on_image` (the words, in EHN voice).
3. **Design** — `build_brief` (the topic-specific Canva brief) **and** `design_recipe`
   (the *same* EHN-branded design as a **reusable, topic-agnostic template** with placeholders).

The detachable `design_recipe` is the key move: Rohan can take a topic the **pipeline** surfaced
(Perplexity) and graft a **winner's** `design_recipe` onto it — proven visual style, fresh topic.
So the design recipes across the 10 posts effectively form a weekly **design library**.

Branding is enforced in `draftPost()`: `build_brief` / `design_recipe` translate the winner's
*layout* into EHN's own palette (cream/white/charcoal bg, green `#39B54A` accent only) and Satoshi
type — they never echo the competitor's hex colours or fonts.

**Fetch at run time** (both published via GitHub Pages, return 200):
- `https://speaktothewind.github.io/ehn-competitor-lab/weekly-plan.json` — the 10 pickable posts
- `https://speaktothewind.github.io/ehn-competitor-lab/weekly-patterns.json` — raw winners + rollups

Still-useful rollups from `weekly-patterns.json` for steering:
- **Topic steering** — `trending.topic` / `trending_au.topic` bias selection toward proven demand.
- **Faceless filter** — `is_text_card || has_face === false` mines only the formats EHN will make
  (the Steven Judge play); `faceless_share` shows how much of the winning band is faceless.

### `weekly-plan.json` shape

```jsonc
{
  "week": "2026-06-03", "dry_run": false,
  "variety": { "formats": [...], "hooks": [...], "topics": [...] },
  "posts": [
    {
      "slot": 1,
      "modelled_on": { "account": "...", "score": 4.2, "platform": "instagram", "region": "au", "url": "..." },
      "format": "carousel", "hook": "myth-bust", "topic": "gut/SIBO", "register": "validation",
      "has_face": false, "is_text_card": true, "visual_recipe": "(the COMPETITOR's look, reference only)",
      "angle":       "(1) the topic angle",
      "caption":     "(2) IG/FB caption, EHN voice",
      "gmb_caption": "(2) Google Business Profile version",
      "on_image":    "(2) the words on the graphic",
      "build_brief":   "(3) topic-specific Canva brief, EHN palette",
      "design_recipe": "(3) reusable, topic-agnostic design — graft onto any topic"
    }
  ]
}
```

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
