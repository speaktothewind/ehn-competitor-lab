// Bring the current weekly-plan.json up to schema v2 (pipeline routing fields)
// WITHOUT a live regen. Imports the same routeOf/constants the generator uses, so
// the patched feed is identical to what a fresh extract.mjs run would emit.
import { readFileSync, writeFileSync } from 'node:fs';
import { routeOf, slideCountOf, RENDER_CONSTRAINTS, PILLAR_MAP } from './extract.mjs';

const path = new URL('./weekly-plan.json', import.meta.url);
const plan = JSON.parse(readFileSync(path, 'utf8'));

plan.schema_version = 2;
plan.feed_role = 'Lab = generator/feed. The clinic SM pipeline (cockpit) owns GATE-1 dedupe, floor-locked rendering, the single preview, and publishing.';
plan.pillar_format_map = PILLAR_MAP;
plan.render_constraints = RENDER_CONSTRAINTS;
plan.posts = plan.posts.map(p => ({ ...p, slide_count: slideCountOf(p), routing: routeOf(p) }));

writeFileSync(path, JSON.stringify(plan, null, 2) + '\n', 'utf8');

const flagged = plan.posts.filter(p => p.routing.gate1_risk);
console.log(`Patched ${plan.posts.length} posts to schema v2.`);
console.log(`gate1_risk flagged: ${flagged.length} → ${flagged.map(p => `slot ${p.slot} (${p.topic})`).join(', ') || 'none'}`);
console.log('Routing sample:', JSON.stringify(plan.posts[0].routing, null, 2));
