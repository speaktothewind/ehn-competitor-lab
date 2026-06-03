# Spec — Engagement-look discovery (faithful layout, EHN-anchored colour)

**Date:** 2026-06-04
**Status:** Design agreed; implementation pending (blocked only on Canva MCP capability check)
**Repos touched:** `ehn-competitor-lab` (extractor + viewer), `Social Media Pipeline` (design/posting + scheduled-task SKILL)

## The point

The north star of this whole project is to **find the visual look that gets EHN engagement** — not to
decorate a fixed house style. The competitor-outlier data is the evidence base; the EHN post is the
experiment. So the *design choice for each post is a hypothesis being tested*, and the dashboard's own
outlier score (YOU-tagged posts vs EHN's median) is the measurement instrument.

This supersedes the narrower framing in the 2026-06-03 branding commit (`a4e2c61`), which forced every
winner into EHN's locked look ("structure not skin"). That deleted the exact variable we want to test.

## The principle: faithful **layout**, EHN-anchored **colour**

**Take faithfully from the winner** (the engagement signal Rohan believes in):
- Whitespace ratio (the Steven Judge "breathing room on the card" effect)
- Text scale relative to frame, letter/word placement, visual hierarchy
- Density, composition, format (carousel / text-card / etc.), on-image word count

**Render in EHN's colour world** (never copy the competitor's palette):
- **Green (`#39B54A`) must appear as the anchor.**
- Any additional colours must **complement** the green — harmonious, never clashing
  (no "purple butterfly on mismatched greens"). Palette may flex per post; it is *not* locked to the
  core cream/white/charcoal tokens, but everything must read as green-anchored and intentional.
- EHN type (Satoshi). *(Open Q: always Satoshi, or allow a winner's type treatment if it complements?)*

**Brand floor (only non-negotiables):** green anchor · logo lockup (small, unobtrusive) ·
booking/CTA destination · clinical-compliance (no cure claims etc. — content, not look).

## Components / changes

### 1. `extract.mjs` → `draftPost()` (refine, don't reverse the 2026-06-03 commit)
- `design_recipe` becomes the star: capture the winner's **layout mechanics faithfully** — whitespace
  ratio, text scale relative to frame, density, composition, hierarchy, format, word count — as a
  reusable, topic-agnostic template, rendered in an EHN-anchored complementary palette.
- `build_brief`: same, but topic-specific.
- **Colour rule loosens** from "cream/white/charcoal + one green italic word" to "**green anchor + a
  complementary palette chosen to suit the post; never the competitor's palette; never clashing.**"
- Keep the vision step's `dominant_colors` — now *input* (what made the winner pop) rather than
  something to discard, translated into a green-harmonious equivalent.

### 2. Format → production-tool routing
- Each plan post declares a `production_tool`: `canva` for typographic/carousel/text-card looks
  (where precise text + whitespace is the point), `kie` for photographic/hero looks.
- Pipeline design stage branches on it. The pipeline's **locked typography rules become defaults for
  the Kie.ai path only**, not a global gate — the Canva path follows the faithful-layout recipe.
- Canva and Kie.ai are not rivals; the winning post's format picks the tool.

### 3. Measurement loop (the piece that makes this an experiment)
- Tag each EHN post with the **look/recipe it tested** (lightweight `recipe_id`).
- Read engagement back via the dashboard's YOU score (EHN posts vs EHN median).
- Over weeks, attribute lift to looks → EHN's winning look is *discovered*, not decreed.
- *(Open Q: exact attribution mechanism — recipe_id tag carried into a small experiment log?)*

### 4. Canva production path — BLOCKED on capability check
- Canva MCP was installed 2026-06-04, unused, and is **not reachable from the CLI session**.
- **Resolve first:** smoke-test with one `build_brief` — can it create a design from text? export a
  PNG? does it need a template ID? The answer sets how automated vs assisted the Canva path is.

## Open questions (resolve-first)
1. **Canva MCP capabilities** (gating for §2/§4 automation depth).
2. **Attribution mechanism** for the measurement loop (§3).
3. **Type latitude** — always Satoshi, or allow a winner's type treatment when it complements?

## Out of scope (YAGNI)
- Auto-posting changes, Zernio scheduling changes, article/newsletter pipeline.
- Widening the topic enum (tracked separately).
- Any change to the dashboard's scoring maths.

## Migration note
First implementation step is reworking `draftPost()` to the refined principle **before the next
Tuesday Action run**, so the old "force into EHN palette" behaviour doesn't bake into real drafts.
