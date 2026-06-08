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
import { pathToFileURL } from 'node:url';

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

// ---- Pipeline alignment (LOCKED 2026-06-04) --------------------------------
// "Lab feeds, pipeline owns." This Lab is a JSON feed: it surfaces over-performers
// and emits copy + design recipes. The clinic SM pipeline (cockpit) owns GATE-1
// dedupe, floor-locked rendering, the single preview, and publishing. These
// constants + routeOf() make each post's routing unambiguous so the feed drops
// straight into the cockpit with zero manual reshaping.

// GATE-1 pre-flight: topics EHN has run in roughly the last 4 weeks. Keep in sync
// with the pipeline's topic-log.md. Surfacing one risks a collapse in the cockpit,
// so we de-prioritise it in selection and flag (never silently drop) any that slip in.
export const RECENT_EHN_TOPICS = ['toxins/mould/microplastics']; // stealth mould ran 2026-05-25

// Pillar → format schedule the pipeline runs. Each winner is tagged with its best-fit
// pillar/day so the cockpit can slot it. Documentation copy carried in the feed.
export const PILLAR_MAP = {
  'education · Mon/Wed/Fri': 'text-only myth-bust OR stat-drop carousel',
  'trust · Tue':            'headshot + symptom listicle (face-branded day)',
  'trust · Sat':            'first-person reflective carousel',
  'engagement · Thu':       'question carousel',
  'conversion · Sun':       'text-led CTA carousel (booking/assessment link in the caption, not on a card)',
};

// Render contract the pipeline's floor-locked renderers enforce. Carried in the feed
// so the design recipes and the cockpit agree on one set of rules.
export const RENDER_CONSTRAINTS = {
  palette:   { bg: '#FAF8F5', text: '#2D3436', accent: '#39B54A', note: 'EHN palette only — never the competitor colours/fonts.' },
  typography:{ headings: 'Satoshi Bold', body: 'Satoshi Medium', note: 'NOT Libre Caslon — that is the branded-card lock, benched for this experiment.' },
  legibility_floors_px_on_1080: { any_text: 36, body: 40, heading: 95 },
  rule: 'Shorten copy, never shrink font. The renderer hard-asserts >=36px and crashes the build on an under-floor size.',
  card_branding: 'Cards carry the business name "Elemental Health & Nutrition" (green close line) — NOT the suburb. Suburb keyword lives in the GBP caption only (local SEO).',
  gbp: 'Every post ships a GBP hook card, including text-only days (Zernio silently schedules a card-less GBP post — always supply one).',
  compliance: 'AHPRA/TGA-safe: no supplement doses, no cure/treat-[condition]/guarantee/miracle/before-after.',
};

// Calculate days since post was published. Used for recency filtering in the dashboard.
export function daysSincePost(timestamp) {
  if (!timestamp) return null;
  const now = new Date();
  const post = new Date(timestamp);
  return Math.floor((now - post) / (1000 * 60 * 60 * 24));
}

// Tag post with recency window: "7d" if ≤7 days old, "30d" if ≤30 days old, or null if older.
export function recencyWindowOf(timestamp) {
  const days = daysSincePost(timestamp);
  if (days === null) return null;
  if (days <= 7) return '7d';
  if (days <= 30) return '30d';
  return null;
}

// Count carousel slides from the on_image text ("Slide 1: …" / "Card 1: …").
export function slideCountOf(p) {
  if (p.format === 'reel/video') return null;
  if (p.format !== 'carousel') return 1;
  const m = (p.on_image || '').match(/\b(?:slide|card)\s*\d+/gi);
  if (!m) return null;
  return Math.max(...m.map(s => +s.match(/\d+/)[0]));
}

// Map a winner's format+hook to pillar/day + per-surface routing the cockpit consumes.
export function routeOf(p) {
  const face = p.has_face === true;
  const isReel = p.format === 'reel/video';
  const isCarousel = p.format === 'carousel';
  const isTextOnly = p.format === 'text-only';

  const image_need = isReel ? 'footage' : isTextOnly ? 'none' : 'still';

  let pillar = 'education', day_fit = 'Mon/Wed/Fri';
  if (p.hook === 'personal-story')        { pillar = 'trust';      day_fit = 'Sat'; }
  else if (p.hook === 'listicle')         { pillar = 'trust';      day_fit = 'Tue'; }
  else if (p.hook === 'question-bait')    { pillar = 'engagement'; day_fit = 'Thu'; }
  else if (p.hook === 'comment-to-DM')    { pillar = 'conversion'; day_fit = 'Sun'; }
  // myth-bust / stat-drop / contrarian / announcement → education default

  const fb_text_only = isTextOnly;                 // FB text-only valid only for text-only myth-bust days
  const gate1_risk = RECENT_EHN_TOPICS.includes(p.topic);

  return {
    pillar, day_fit,
    image_need,                                    // none | still | footage
    face_branded: face,                            // face brands the whole day (FB + GBP + every slide) if selected
    fb_text_only,
    gbp_card_required: true,                        // GBP ALWAYS carries a hook card
    instagram: isCarousel ? { kind: 'slides', slides: slideCountOf(p) }
             : isReel     ? { kind: 'reel', asset: 'footage' }
             :              { kind: 'image' },
    facebook: fb_text_only ? { image: null, text_only: true }
                           : { kind: 'image', source: 'hook_card' },
    googlebusiness: { image: 'hook_card_required' },
    gate1_risk,
    gate1_note: gate1_risk
      ? `Topic "${p.topic}" ran in EHN's last ~4 weeks — pipeline GATE-1 will likely collapse/drop this pick.`
      : null,
  };
}

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
// FB feed: prefer ISO `time` col; `timestamp` is unix epoch (s or ms) — convert so recency_window/daysSincePost work (kept in sync with index.html fbDate)
function fbDate(r) {
  if (r.time && /^\d{4}-\d{2}-\d{2}/.test(r.time)) return r.time.slice(0, 10);
  const ts = String(r.timestamp || '');
  if (/^\d{10}$/.test(ts)) return new Date(+ts * 1000).toISOString().slice(0, 10);
  if (/^\d{13}$/.test(ts)) return new Date(+ts).toISOString().slice(0, 10);
  return ts.slice(0, 10);
}
function mapFB(r) {
  const isVideo = String(r.isVideo).toLowerCase() === 'true';
  return {
    platform: 'facebook',
    account: r.pageName || '',
    caption: (r.text || '').slice(0, 200),
    captionFull: r.text || '',
    url: r.url || '',
    timestamp: fbDate(r),
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
function selectVaried(pool, n, recent = []) {
  const chosen = [];
  const seen = { format: {}, hook: {}, topic: {} };
  const cands = pool.slice();
  while (chosen.length < n && cands.length) {
    let best = null, bestVal = -Infinity, bestIdx = -1;
    cands.forEach((c, i) => {
      const pen = (seen.format[c.format] || 0) * 3 + (seen.hook[c.hook] || 0) * 2 + (seen.topic[c.topic] || 0) * 2;
      const au = c.region === 'au' ? 0.5 : 0;
      const g1 = recent.includes(c.topic) ? 6 : 0;   // GATE-1: de-prioritise topics EHN ran recently
      const val = -pen - g1 + au + Math.min(Math.log10(c.score || 1), 1) * 0.3 - i * 0.001;
      if (val > bestVal) { bestVal = val; best = c; bestIdx = i; }
    });
    chosen.push(best); cands.splice(bestIdx, 1);
    seen.format[best.format] = (seen.format[best.format] || 0) + 1;
    seen.hook[best.hook] = (seen.hook[best.hook] || 0) + 1;
    seen.topic[best.topic] = (seen.topic[best.topic] || 0) + 1;
  }
  return chosen;
}

// EHN brand tokens (canonical source: ehn-brand-kit / ehn-html-design). The build_brief must
// dress the winner's STRUCTURE in THIS palette/type — never echo the competitor's colours/fonts.
const EHN_BRAND =
  `EHN BRAND KIT — render the winner's LAYOUT in these principles, never copy the competitor's colours/fonts:\n` +
  `- Green anchor (REQUIRED): #39B54A must appear prominently as the visual anchor — the post should feel "EHN green".\n` +
  `- Complementary palette: Choose secondary colours to harmonize with EHN green. Examples that work: sage, teal, soft grey-blue, warm cream, charcoal, muted terracotta, soft neutrals. Examples that CLASH: purple, bright pink, orange, strong red, neon. The palette may flex per post — choose colours that suit the topic/mood while anchored to green.\n` +
  `- Backgrounds: Cream, white, charcoal, or a muted colour that complements green. NEVER pure black, never the competitor's exact palette, never a full green background.\n` +
  `- Type: Satoshi throughout (matching the winner's typographic weight/scale). Headlines in bold (700), with ONE meaningful word highlighted in green #39B54A or a complementary accent colour; body copy in charcoal or a neutral that reads clearly.\n` +
  `- Shape & feel: Match the winner's layout (whitespace, card shape, border radius, density). Keep it clinical-but-warm, editorial, grounded. Australian-natural imagery (sage, cream, charcoal tones), never stock-wellness clichés.\n` +
  `- Typography lock: headings Satoshi BOLD (700), body Satoshi MEDIUM (500). NOT Libre Caslon (that is the branded-card lock, benched for this experiment).\n` +
  `- Legibility floors (HARD — the renderer asserts and crashes below these on a 1080 canvas): any text >=36px, body >=40px, headline ~95px+. Rule: SHORTEN COPY, NEVER SHRINK THE FONT. Never specify a point/pixel size that implies sub-36px text.\n` +
  `- Card branding: the brand/close line on cards is the business name "Elemental Health & Nutrition" (green close line) — NOT the suburb. The suburb keyword belongs in the GBP caption only.\n` +
  `- GBP card: every post ships a Google Business hook card too (a minimal charcoal hook card), including text-only days.\n` +
  `- Brand floor (non-negotiable): EHN green anchor · logo lockup (small, unobtrusive) · booking/CTA destination · clinical-compliance (no cure claims).`;

const DRAFT_TOOL = {
  name: 'draft_post',
  description: 'Write an Elemental Health & Nutrition post that reuses the STRUCTURE of a competitor winner, in EHN clinician voice. One creative, reused across Instagram, Facebook and Google Business Profile.',
  input_schema: {
    type: 'object',
    properties: {
      angle: { type: 'string', description: 'One-line EHN topic angle for this post.' },
      build_brief: { type: 'string', description: 'Plain step-by-step instructions for EHN (or a VA) to build THIS graphic in Canva — describe what EHN should MAKE, not what the competitor did. Borrow only the winner\'s LAYOUT/STRUCTURE; dress it entirely in EHN\'s brand. Include: canvas/format (e.g. square carousel, 4 slides / single square card / vertical reel cover), background chosen to harmonize with EHN green #39B54A (may be cream, white, charcoal, sage, soft neutrals, or other complementary colours — never pure black, never the competitor\'s exact palette), headline placement + weight (Satoshi bold, one meaningful word in green #39B54A italic), green #39B54A as the primary visual anchor, any icon/photo/illustration in EHN\'s grounded editorial style. NEVER quote the competitor\'s hex colours or fonts. Respect the legibility floors (any text >=36px, body >=40px, headline ~95px+ on a 1080 canvas) — express sizes as relative hierarchy, never as a point size that implies sub-36px text; if copy is long, shorten it rather than shrinking the font. Headings Satoshi Bold, body Satoshi Medium. Brand/close line is "Elemental Health & Nutrition" (not the suburb). Concrete enough to hand straight to a designer.' },
      design_recipe: { type: 'string', description: 'A REUSABLE, TOPIC-AGNOSTIC version of build_brief — the same EHN-branded visual template with THIS post\'s specific words stripped out, so the design can be grafted onto ANY topic (including one the social pipeline surfaced). Use placeholders like "[headline]", "[stat]", "[supporting line]", "[slide N point]" instead of real copy. Describe only the reusable shell: canvas/format, layout/composition, EHN palette usage (green #39B54A as visual anchor, secondary colours chosen to harmonize and never clash), Satoshi headline treatment (one meaningful word in green #39B54A italic or a complementary accent colour), where text/stat/image/icon sit, and the overall feel. No topic-specific wording at all.' },
      on_image: { type: 'string', description: 'The exact words that go ON the graphic. Carousel → slide by slide ("Slide 1: … | Slide 2: …"). Text card → headline + subline. Reel → on-screen hook frame + a 2-3 beat script outline. Keep every line SHORT so nothing must render below 36px (headline <= ~8 words; slide body a short phrase) — shorten copy, never shrink the font. The card brand/close line is "Elemental Health & Nutrition", never the suburb.' },
      caption: { type: 'string', description: 'Caption for Instagram & Facebook in EHN voice: warm, clinician-credible, plain-English, AUSTRALIAN spelling, evidence-based, NOT hypey, NOT supplement-selling. AHPRA/TGA-safe (no doses, no cure/treat/guarantee/miracle/before-after). End with a soft CTA + 3-5 relevant hashtags.' },
      gmb_caption: { type: 'string', description: 'Shorter Google Business Profile version (2-3 sentences, local tone, ends with a clear CTA e.g. "Book an appointment"). Include the locality keyword (e.g. "Eastwood, Adelaide") for local SEO — the suburb lives here, NOT on the cards. No hashtags.' },
    },
    required: ['angle', 'build_brief', 'design_recipe', 'on_image', 'caption', 'gmb_caption'],
  },
};

async function draftPost(anthropic, w) {
  const prompt =
    `You are writing for Elemental Health & Nutrition (EHN), a functional-medicine clinic in Adelaide, Australia. ` +
    `The goal is to GROW engagement by reverse-engineering what works — borrow the LAYOUT of a winner, render it in EHN's own brand.\n\n` +
    `MODEL THIS WINNER (take its structure, render in EHN's colour world):\n` +
    `- Format: ${w.format}\n- Hook type: ${w.hook}\n- Topic: ${w.topic}\n- Register: ${w.register}\n` +
    `- Winner's layout/structure (COPY FAITHFULLY — whitespace, text scale, density, hierarchy, composition): ${w.visual_recipe}\n` +
    `- Winner's caption (reference only): """${(w.exemplar || '').slice(0, 400)}"""\n\n` +
    `${EHN_BRAND}\n\n` +
    `Write an EHN post on ${w.topic} (or an adjacent functional-medicine angle) using the SAME format + hook + register as the winner. ` +
    `CRITICAL: in build_brief, take the winner's LAYOUT exactly (whitespace ratio, text scale, density, hierarchy, composition) and ` +
    `render it in a green-anchored complementary palette — never the competitor's colours. Green #39B54A must anchor the design; ` +
    `secondary colours must harmonize with green, never clash. The palette can flex per post, but everything must feel green-anchored and intentional. ` +
    `Then in design_recipe, give the SAME design as a reusable, topic-agnostic template (specific words replaced with placeholders) ` +
    `so the layout + colour scheme can be grafted onto a different topic later.\n\n` +
    `LEGIBILITY: respect the renderer's hard floors — any on-card text >=36px, body >=40px, headline ~95px+ on a 1080 canvas. ` +
    `Express size as relative hierarchy, never a point size implying sub-36px text. If copy is long, SHORTEN IT — never shrink the font. ` +
    `Headings Satoshi Bold, body Satoshi Medium (never Libre Caslon). Card brand/close line is "Elemental Health & Nutrition", never the suburb. ` +
    `Compliance: AHPRA/TGA-safe — no doses, no cure/treat/guarantee/miracle/before-after.\n\n` +
    `Voice: warm, clinician-credible, plain-English, Australian spelling, evidence-based — not hypey, not a supplement pitch. ` +
    `Call draft_post.`;
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
  const PLAN_N = 10;   // generate extra so Rohan can choose his favourites
  const picks = selectVaried(planPool, PLAN_N, RECENT_EHN_TOPICS);
  const baseSlot = (w, i) => ({
    slot: i + 1,
    modelled_on: { account: w.account, score: w.score, platform: w.platform, region: w.region, url: w.url, post_date: w.timestamp },
    format: w.format, hook: w.hook, topic: w.topic, register: w.register,
    has_face: w.has_face, is_text_card: w.is_text_card,
    visual_recipe: w.visual_recipe, image_url: w.image_url,
  });
  let posts;
  const NULL_DRAFT = { angle: null, build_brief: null, design_recipe: null, on_image: null, caption: null, gmb_caption: null };
  if (DRY) {
    posts = picks.map((w, i) => ({ ...baseSlot(w, i), ...NULL_DRAFT }));
  } else {
    const drafts = await pool(picks, CONCURRENCY, async (w, idx) => {
      try { const d = await draftPost(anthropic, w); console.log(`  plan ${idx + 1}/${picks.length} ${w.format}/${w.hook}/${w.topic} ✓`); return d; }
      catch (e) { console.warn(`  plan ${idx + 1}/${picks.length} draft failed: ${e.message}`); return null; }
    });
    posts = picks.map((w, i) => ({ ...baseSlot(w, i), ...(drafts[i] || NULL_DRAFT) }));
  }
  // Routing fields (pipeline-locked): make each post's pillar/day + per-surface
  // mapping + image-need + face/GBP/GATE-1 flags unambiguous for the cockpit.
  // Recency window: tag for dashboard's 7-day "breakouts" vs 30-day "proven" lens.
  posts = posts.map(p => ({ ...p, slide_count: slideCountOf(p), recency_window: recencyWindowOf(p.modelled_on.post_date), routing: routeOf(p) }));
  const gate1Flagged = posts.filter(p => p.routing.gate1_risk).length;
  if (gate1Flagged) console.log(`  ⚠ ${gate1Flagged} post(s) flagged gate1_risk (recent EHN topic) — pipeline will collapse/drop.`);
  const plan = {
    week: today,
    generated_at: new Date().toISOString(),
    schema_version: 2,                                         // v2: pipeline routing fields + render_constraints
    feed_role: 'Lab = generator/feed. The clinic SM pipeline (cockpit) owns GATE-1 dedupe, floor-locked rendering, the single preview, and publishing.',
    dry_run: DRY,
    note: `One creative reused across Instagram, Facebook & Google Business Profile. ${posts.length} posts to choose from, diversified by format/hook/topic, each modelled on a niche over-performer and rewritten in EHN clinician voice. Each post carries a routing block mapping it to the pipeline's pillar→format schedule.`,
    pillar_format_map: PILLAR_MAP,
    render_constraints: RENDER_CONSTRAINTS,
    variety: { formats: [...new Set(posts.map(p => p.format))], hooks: [...new Set(posts.map(p => p.hook).filter(Boolean))], topics: [...new Set(posts.map(p => p.topic).filter(Boolean))] },
    posts,
  };
  writeFileSync('weekly-plan.json', JSON.stringify(plan, null, 2));
  console.log(`✓ wrote weekly-plan.json (${posts.length} posts; formats: ${plan.variety.formats.join(', ')}).`);
}

// Run main() only when invoked directly — guarded so routeOf/slideCountOf and the
// LOCKED constants can be imported (e.g. by apply-routing.mjs) without firing a full
// network+API run that would overwrite the feeds.
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch(e => { console.error(e); process.exit(1); });
}
