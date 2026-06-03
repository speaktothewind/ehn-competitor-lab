#!/usr/bin/env node
/**
 * EHN Competitor Outlier Lab — weekly pattern extractor.
 *
 * Headless twin of index.html: fetches the same two published Google Sheets CSVs,
 * scores every post against its own account's median (identical compute/dedupe/
 * normalize logic), filters to the over-performer band (>=2x), tags each winner by
 * format, and — for each winner — asks Claude (vision) for a hook/topic/register
 * classification plus a reproducible "visual recipe" of the creative.
 *
 * Output: weekly-patterns.json — the single structured file the content pipeline ingests.
 *
 * The CDN image URLs in the feed are signed and expire in hours-to-days, so the
 * vision step MUST run here, in the same job, right after the weekly Apify refresh.
 * We persist the recipe (durable text), not the URL.
 *
 * Run:  ANTHROPIC_API_KEY=sk-... node extract.mjs
 * Without a key it runs in DRY mode: scores + format tags + image URLs, AI fields null.
 */

import Papa from 'papaparse';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync } from 'node:fs';

// ---- Config (mirrors index.html) -------------------------------------------
const CSV_URLS = [
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSrxfB_2zHHAthnBrGiyTvHp0Rg-zQ3lYCZZ02lO4cNtuDyk32B54IWCpUrNkMpRyJfA7ehXz8hpeG2/pub?output=csv',
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vSrLbTQLJGNH9YAe2Cc3YAf_rfi0vylFGb7a00RwQVdimRO9J0vC7G3YvEoSRv_b-RDww_uk-Hvwudh/pub?output=csv',
];
const SELF = ['elemental_health_nutrition', 'elementalhealthandnutrition'];
const AUSET = ['functionalmedicineau','advancedfunctional','stevenjudge','shiftclinic','maslen','melbournefxmed','mthfrsupport','furness','dilorenzo','supercharged','leeholmes','cyndiomeara','thehealthygut','coomes','askdrvincent','candrawinata','sibodoctor','lucyrose','koullouros','ehrlich','kristof','woolhouse','holisticgp','homehealthdoc','bijlsma','thatgutfeeling','kulturedwellness','afhealth','herbnerd'];
const FORMAT = ['karan','dridz','doctormike','idriss','doctorly','muneeb','whitneybowe','richbff','humphrey','ramit','huberman'];

// Per-bucket vision allocation. Pure top-by-score buries AU competitors (their healthy
// 8-16x outliers lose every slot to US accounts' median-artefact extremes), so we reserve
// slots per bucket and take the top scorers within each. Niche TOPIC signal comes from
// AU+US competitors; format-school accounts are mined for FORMAT, not topic.
const ALLOC = { 'AU-competitor': 18, 'US/other': 16, 'format-school': 8, 'YOU': 6 };
const MAX_PER_ACCOUNT = 3;  // stop one low-median page defining a bucket's pattern signal
// Confidence floor: below this median engagement, an account is near-dead (mostly low-
// engagement Facebook mirror pages) and a "2x outlier" is just noise (~20 interactions).
// Such winners are KEPT and flagged low_confidence, but excluded from the trending rollups
// and de-prioritised for the vision budget. 10 sits above real small AU accounts (Steven
// Judge median ~24) and below the dead FB pages (EHN FB ~0.5, several AU mirrors 0-8).
const MIN_MEDIAN = 10;
const MODEL = 'claude-haiku-4-5';     // vision-capable, cheap; ~cents per weekly run
const CONCURRENCY = 5;

// ---- Scoring logic — ported verbatim from index.html -----------------------
const norm = a => (a || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const isAU = a => AUSET.some(t => norm(a).includes(t));
const isFormat = a => FORMAT.some(t => norm(a).includes(t));
function bucketOf(account) {
  const a = (account || '').toLowerCase();
  if (SELF.includes(a)) return 'YOU';
  if (isFormat(account)) return 'format-school';
  if (isAU(account)) return 'AU-competitor';
  return 'US/other';
}
const eng = r => (+r.likes || 0) + (+r.comments || 0) + (+r.shares || 0);
function median(a) { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; }
const tierOf = s => s >= 4 ? 'breakout' : s >= 2 ? 'replicable' : s >= 1.3 ? 'working' : 'normal';

function compute(rows) {
  const by = {};
  rows.forEach(r => { (by[r.account] = by[r.account] || []).push(eng(r)); });
  const md = {};
  for (const a in by) md[a] = median(by[a]) || 1;
  rows.forEach(r => {
    r._eng = eng(r);
    r._median = median(by[r.account]);            // raw account median (0 allowed, unlike scoring divisor)
    r._score = r._eng / (md[r.account] || 1);
    r._tier = tierOf(r._score);
    r._low = r._median < MIN_MEDIAN;              // confidence flag
  });
  return rows;
}
function normalize(rows) {
  rows.forEach(r => {
    r.account = (r.account || '').trim();
    const a = r.account.toLowerCase();
    r._self = SELF.includes(a);
    r._format = isFormat(r.account);
    r._bucket = bucketOf(r.account);
    r.region = (r._self || isAU(r.account)) ? 'au' : 'us';
  });
  // Per CLAUDE.md: likes:-1 means hidden/unavailable, NOT zero. Such posts have unknown
  // engagement and (kept as -1) deflate their account's median, inflating every score on
  // it — the root of the 300x+ artefacts. Drop them from scoring entirely.
  return rows.filter(r => r.account && r.account !== 'nan' && (+r.likes || 0) >= 0);
}
function dedupe(rows) {
  const seen = new Map();
  rows.forEach(r => {
    const key = (r.url || '').trim() || ((r.account || '') + '|' + (r.caption || '') + '|' + (r.timestamp || ''));
    const cur = seen.get(key);
    if (!cur || eng(r) > eng(cur)) seen.set(key, r);
  });
  return [...seen.values()];
}

// ---- Row mapping — ported from index.html, EXTENDED with image + media fields
function mapIG(r) {
  const type = r.type || '';
  return {
    platform: 'instagram',
    account: r.ownerUsername || '',
    caption: (r.caption || '').slice(0, 200),
    captionFull: r.caption || '',
    url: r.url || '',
    timestamp: (r.timestamp || '').slice(0, 10),
    likes: +r.likesCount || 0,
    comments: +r.commentsCount || 0,
    shares: 0,
    views: +r.videoViewCount || 0,
    // visual layer
    image: r.displayUrl || r['images/0'] || '',
    _mediaType: type,
    _isVideo: !!(r.videoUrl) || type.toLowerCase() === 'video',
  };
}
function mapFB(r) {
  const isVideo = String(r.isVideo).toLowerCase() === 'true';
  return {
    platform: 'facebook',
    account: r.pageName || '',
    caption: (r.text || '').slice(0, 200),
    captionFull: r.text || '',
    url: r.url || '',
    timestamp: (r.timestamp || '').slice(0, 10),
    likes: +r.likes || 0,
    comments: +r.comments || 0,
    shares: +r.shares || 0,
    views: +r.viewsCount || 0,
    image: r['media/0/image/uri'] || r['media/0/thumbnailImage/uri'] || r['media/0/photo_image/uri'] || '',
    _mediaType: isVideo ? 'video' : 'post',
    _isVideo: isVideo,
  };
}
function mapRow(r) {
  if ('ownerUsername' in r) return mapIG(r);
  if ('pageName' in r) return mapFB(r);
  return null;
}
function formatOf(r) {
  if (r._isVideo) return 'reel/video';
  if (r.platform === 'instagram' && (r._mediaType || '').toLowerCase() === 'sidecar') return 'carousel';
  if (!r.image) return 'text-only';
  return 'image';
}

async function fetchCSV(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`CSV fetch ${res.status} for ${url}`);
  const text = await res.text();
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

// ---- Vision + text classification ------------------------------------------
const TAXONOMY = {
  hook: ['contrarian', 'myth-bust', 'listicle', 'personal-story', 'question-bait', 'stat-drop', 'comment-to-DM', 'announcement', 'other'],
  topic: ['gut/SIBO', 'hormones/perimenopause', 'thyroid', 'methylation/MTHFR', 'mental-health', 'toxins/mould/microplastics', 'movement/walking', 'fasting/nutrition', 'lab-interpretation', 'sleep', 'longevity', 'other'],
  register: ['fear/urgency', 'hope', 'validation', 'faith', 'humour', 'curiosity', 'authority', 'other'],
};
const TOOL = {
  name: 'record_pattern',
  description: 'Record the structured pattern tags and a reproducible visual recipe for one over-performing social post.',
  input_schema: {
    type: 'object',
    properties: {
      hook: { type: 'string', enum: TAXONOMY.hook, description: 'The caption/opening hook style.' },
      topic: { type: 'string', enum: TAXONOMY.topic, description: 'The health topic.' },
      register: { type: 'string', enum: TAXONOMY.register, description: 'Dominant emotional register.' },
      has_face: { type: 'boolean', description: 'Is a human face visibly present in the creative?' },
      is_text_card: { type: 'boolean', description: 'Is it a plain text-on-colour/photo card (no talking head)?' },
      visual_recipe: { type: 'string', description: 'A reproducible recipe of the creative: layout, approx word count, font weight/size relative to frame, colours (hex if guessable), photo vs illustration vs solid colour, faces, overlays. One or two sentences someone could rebuild from.' },
      dominant_colors: { type: 'array', items: { type: 'string' }, description: 'Up to 3 dominant colours, hex or plain name.' },
      text_word_count_est: { type: 'integer', description: 'Estimated count of words rendered ON the image (0 if none).' },
    },
    required: ['hook', 'topic', 'register', 'has_face', 'is_text_card', 'visual_recipe'],
  },
};

async function fetchImageBlock(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) return null;
    const ct = (res.headers.get('content-type') || '').split(';')[0].trim();
    const media_type = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(ct) ? ct : 'image/jpeg';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 100 || buf.length > 4_500_000) return null; // skip empties / oversized
    return { type: 'image', source: { type: 'base64', media_type, data: buf.toString('base64') } };
  } catch { return null; }
}

async function classify(anthropic, w) {
  const content = [];
  let sawImage = false;
  if (w.image) {
    const block = await fetchImageBlock(w.image);
    if (block) { content.push(block); sawImage = true; }
  }
  content.push({
    type: 'text',
    text:
      `This is an over-performing post in the functional/integrative-medicine niche ` +
      `(${w.platform}, format: ${w.format}, ${w._score.toFixed(1)}x its account's median).\n\n` +
      `CAPTION:\n"""${(w.captionFull || '(no caption)').slice(0, 1500)}"""\n\n` +
      (sawImage
        ? `The image above is the post creative. Classify the hook/topic/register from the caption, and describe the creative as a reproducible visual recipe.`
        : `No image is available (text-only or media unavailable). Classify hook/topic/register from the caption; set has_face=false, is_text_card=true if it's clearly a text post, and describe what you can in visual_recipe (note "no image available").`) +
      `\nCall record_pattern with your answer.`,
  });
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 700,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'record_pattern' },
    messages: [{ role: 'user', content }],
  });
  const use = msg.content.find(b => b.type === 'tool_use');
  return { ...use?.input, _sawImage: sawImage };
}

// small concurrency pool
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx], idx); }
  }));
  return out;
}

const modeOf = arr => {
  const c = {}; arr.forEach(v => { if (v) c[v] = (c[v] || 0) + 1; });
  const e = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
  return e ? { value: e[0], count: e[1] } : null;
};

// ---- Weekly content plan ---------------------------------------------------
// Pick N winners that MAXIMISE spread across format + hook + topic, so a week's posts
// aren't seven of the same thing. Lightly favours higher scores and AU origin.
function selectVaried(pool, n) {
  const chosen = [];
  const seen = { format: {}, hook: {}, topic: {} };
  const cands = pool.slice();
  while (chosen.length < n && cands.length) {
    let best = null, bestVal = -Infinity, bestIdx = -1;
    cands.forEach((c, i) => {
      const pen = (seen.format[c.format] || 0) * 3 + (seen.hook[c.hook] || 0) * 2 + (seen.topic[c.topic] || 0) * 2;
      const au = c.region === 'au' ? 0.5 : 0;
      const val = -pen + au + Math.min(Math.log10(c.score || 1), 1) * 0.3 - i * 0.001;
      if (val > bestVal) { bestVal = val; best = c; bestIdx = i; }
    });
    chosen.push(best); cands.splice(bestIdx, 1);
    seen.format[best.format] = (seen.format[best.format] || 0) + 1;
    seen.hook[best.hook] = (seen.hook[best.hook] || 0) + 1;
    seen.topic[best.topic] = (seen.topic[best.topic] || 0) + 1;
  }
  return chosen;
}

const DRAFT_TOOL = {
  name: 'draft_post',
  description: 'Write an Elemental Health & Nutrition post that reuses the STRUCTURE of a competitor winner, in EHN clinician voice. One creative, reused across Instagram, Facebook and Google Business Profile.',
  input_schema: {
    type: 'object',
    properties: {
      angle: { type: 'string', description: 'One-line EHN topic angle for this post.' },
      on_image: { type: 'string', description: 'The exact text that goes ON the graphic. Carousel → slide by slide ("Slide 1: … | Slide 2: …"). Text card → headline + subline. Reel → the on-screen hook frame + a 2-3 beat script outline.' },
      caption: { type: 'string', description: 'Caption for Instagram & Facebook in EHN voice: warm, clinician-credible, plain-English, AUSTRALIAN spelling, evidence-based, NOT hypey, NOT supplement-selling. End with a soft CTA + 3-5 relevant hashtags.' },
      gmb_caption: { type: 'string', description: 'Shorter Google Business Profile version (2-3 sentences, local Adelaide tone, ends with a clear CTA e.g. "Book an appointment"). No hashtags.' },
    },
    required: ['angle', 'on_image', 'caption', 'gmb_caption'],
  },
};

async function draftPost(anthropic, w) {
  const prompt =
    `You are writing for Elemental Health & Nutrition (EHN), a functional-medicine clinic in Adelaide, Australia. ` +
    `The goal is to GROW engagement by modelling what already over-performs in the niche — borrow the STRUCTURE of a winner, never its supplement-sales tone.\n\n` +
    `MODEL THIS WINNER (adapt the pattern, do not copy the content):\n` +
    `- Format: ${w.format}\n- Hook type: ${w.hook}\n- Topic: ${w.topic}\n- Register: ${w.register}\n` +
    `- Visual recipe of the winner: ${w.visual_recipe}\n` +
    `- Winner's caption (reference only): """${(w.exemplar || '').slice(0, 400)}"""\n\n` +
    `Write an EHN post using the SAME format + hook structure + register, on a topic EHN can credibly own ` +
    `(${w.topic}, or an adjacent functional-medicine angle). Voice: warm, clinician-credible, plain-English, ` +
    `Australian spelling, evidence-based — not hypey, not a supplement pitch. Call draft_post.`;
  const msg = await anthropic.messages.create({
    model: MODEL, max_tokens: 900,
    tools: [DRAFT_TOOL], tool_choice: { type: 'tool', name: 'draft_post' },
    messages: [{ role: 'user', content: prompt }],
  });
  return msg.content.find(b => b.type === 'tool_use')?.input;
}

// ---- Main ------------------------------------------------------------------
async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const key = process.env.ANTHROPIC_API_KEY;
  const DRY = !key;
  if (DRY) console.warn('⚠  ANTHROPIC_API_KEY not set — DRY mode: scoring + format tags + image URLs only, AI fields null.');

  // 1. fetch + map
  const raw = [];
  for (const u of CSV_URLS) {
    const rows = await fetchCSV(u);
    rows.forEach(r => { const m = mapRow(r); if (m) raw.push(m); });
  }
  console.log(`Fetched ${raw.length} rows from ${CSV_URLS.length} feeds.`);

  // 2. score (identical pipeline order to dashboard: normalize -> dedupe -> compute)
  const all = compute(dedupe(normalize(raw)));
  all.forEach(r => { r.format = formatOf(r); });

  // 3. select over-performers (>=2x), stratified by bucket so AU isn't starved
  const overperformers = all.filter(r => r._score >= 2).sort((a, b) => b._score - a._score);
  const breakouts = overperformers.filter(r => r._score >= 4);
  const selected = [];
  const dropPerBucket = {};
  for (const [bucket, n] of Object.entries(ALLOC)) {
    const inBucket = overperformers.filter(r => r._bucket === bucket); // already score-sorted
    // high-confidence first, then low-confidence fills any remaining slots (flagged)
    const ordered = [...inBucket.filter(r => !r._low), ...inBucket.filter(r => r._low)];
    const perAcct = {};
    const pick = [];
    for (const r of ordered) {
      if (pick.length >= n) break;
      if ((perAcct[r.account] = (perAcct[r.account] || 0) + 1) <= MAX_PER_ACCOUNT) pick.push(r);
    }
    selected.push(...pick);
    dropPerBucket[bucket] = Math.max(0, inBucket.length - pick.length);
  }
  selected.sort((a, b) => b._score - a._score);
  const dropped = overperformers.length - selected.length;
  console.log(`${all.length} posts scored · ${overperformers.length} over-performers (>=2x), ${breakouts.length} breakout (>=4x).`);
  console.log(`Classifying ${selected.length} (per-bucket): ` +
    Object.entries(ALLOC).map(([b, n]) => `${b} ${Math.min(n, overperformers.filter(r => r._bucket === b).length)}/${overperformers.filter(r => r._bucket === b).length}`).join(' · '));
  if (dropped > 0) console.log(`(${dropped} lower-scored over-performers not classified this run — see counts.not_classified_by_bucket)`);

  // 4. classify
  const anthropic = DRY ? null : new Anthropic({ apiKey: key });
  let tagged;
  if (DRY) {
    tagged = selected.map(w => ({ ...w, _tags: null }));
  } else {
    const results = await pool(selected, CONCURRENCY, async (w, idx) => {
      try { const t = await classify(anthropic, w); console.log(`  [${idx + 1}/${selected.length}] @${w.account} ${w._score.toFixed(1)}x → ${t.hook}/${t.topic}`); return t; }
      catch (e) { console.warn(`  [${idx + 1}/${selected.length}] @${w.account} classify failed: ${e.message}`); return null; }
    });
    tagged = selected.map((w, i) => ({ ...w, _tags: results[i] }));
  }

  // 5. shape winners
  const winners = tagged.map(w => ({
    account: w.account,
    platform: w.platform,
    region: w.region,
    bucket: w._bucket,
    score: +w._score.toFixed(2),
    tier: w._tier,
    engagement: w._eng,
    account_median: w._median,
    low_confidence: w._low,   // near-dead account; score unreliable, excluded from trending
    format: w.format,
    is_format_school: w._format,
    is_you: w._self,
    hook: w._tags?.hook ?? null,
    topic: w._tags?.topic ?? null,
    register: w._tags?.register ?? null,
    has_face: w._tags?.has_face ?? null,
    is_text_card: w._tags?.is_text_card ?? null,
    visual_recipe: w._tags?.visual_recipe ?? null,
    dominant_colors: w._tags?.dominant_colors ?? null,
    text_word_count_est: w._tags?.text_word_count_est ?? null,
    image_classified: w._tags?._sawImage ?? false,
    exemplar: w.caption,
    url: w.url,
    image_url: w.image || null,   // disposable — expires; recipe is the durable artifact
    timestamp: w.timestamp,
  }));

  // 6. trending rollups. Niche TOPIC signal comes from competitors (AU+US); AU-only is the
  //    same-market read Rohan weights; format-school is mined for FORMAT, not topic.
  const roll = ws => ({
    n: ws.length,
    hook: modeOf(ws.map(w => w.hook)),
    topic: modeOf(ws.map(w => w.topic)),
    register: modeOf(ws.map(w => w.register)),
    format: modeOf(ws.map(w => w.format)),
    faceless_share: ws.length ? +(ws.filter(w => w.is_text_card || w.has_face === false).length / ws.length).toFixed(2) : null,
  });
  // Trending excludes low_confidence winners — near-dead accounts shouldn't shape the signal.
  const trust = w => !w.low_confidence;
  const competitors = winners.filter(w => (w.bucket === 'AU-competitor' || w.bucket === 'US/other') && trust(w));
  const auWinners = winners.filter(w => w.bucket === 'AU-competitor' && trust(w));
  const formatSchool = winners.filter(w => w.bucket === 'format-school' && trust(w));

  const out = {
    week: today,
    generated_at: new Date().toISOString(),
    dry_run: DRY,
    counts: {
      posts_scored: all.length,
      overperformers_2x: overperformers.length,
      breakout_4x: breakouts.length,
      classified: winners.length,
      classified_low_confidence: winners.filter(w => w.low_confidence).length,
      classified_by_bucket: Object.fromEntries(Object.keys(ALLOC).map(b => [b, winners.filter(w => w.bucket === b).length])),
      not_classified: dropped,
      not_classified_by_bucket: dropPerBucket,
    },
    trending: roll(competitors),        // the niche signal (AU + US competitors)
    trending_au: roll(auWinners),       // same-market, weight heavily
    format_school_signal: roll(formatSchool),  // for FORMAT modelling only
    winners,
  };

  writeFileSync('weekly-patterns.json', JSON.stringify(out, null, 2));
  console.log(`✓ wrote weekly-patterns.json (${winners.length} winners, week ${today}).`);

  // 7. weekly content plan — 7 diversified posts; one creative reused across IG/FB/GMB.
  let planPool = competitors;                                   // AU+US, high-confidence
  if (planPool.length < 7) planPool = [...planPool, ...formatSchool];
  const picks = selectVaried(planPool, 7);
  const baseSlot = (w, i) => ({
    slot: i + 1,
    modelled_on: { account: w.account, score: w.score, platform: w.platform, region: w.region, url: w.url },
    format: w.format, hook: w.hook, topic: w.topic, register: w.register,
    has_face: w.has_face, is_text_card: w.is_text_card,
    visual_recipe: w.visual_recipe, image_url: w.image_url,
  });
  let posts;
  if (DRY) {
    posts = picks.map((w, i) => ({ ...baseSlot(w, i), angle: null, on_image: null, caption: null, gmb_caption: null }));
  } else {
    const drafts = await pool(picks, CONCURRENCY, async (w, idx) => {
      try { const d = await draftPost(anthropic, w); console.log(`  plan ${idx + 1}/${picks.length} ${w.format}/${w.hook}/${w.topic} ✓`); return d; }
      catch (e) { console.warn(`  plan ${idx + 1}/${picks.length} draft failed: ${e.message}`); return null; }
    });
    posts = picks.map((w, i) => ({ ...baseSlot(w, i), ...(drafts[i] || { angle: null, on_image: null, caption: null, gmb_caption: null }) }));
  }
  const plan = {
    week: today,
    generated_at: new Date().toISOString(),
    dry_run: DRY,
    note: 'One creative reused across Instagram, Facebook & Google Business Profile. 7 posts, diversified by format/hook/topic, each modelled on a niche over-performer and rewritten in EHN clinician voice.',
    variety: { formats: [...new Set(posts.map(p => p.format))], hooks: [...new Set(posts.map(p => p.hook).filter(Boolean))], topics: [...new Set(posts.map(p => p.topic).filter(Boolean))] },
    posts,
  };
  writeFileSync('weekly-plan.json', JSON.stringify(plan, null, 2));
  console.log(`✓ wrote weekly-plan.json (${posts.length} posts; formats: ${plan.variety.formats.join(', ')}).`);
}

main().catch(e => { console.error(e); process.exit(1); });
