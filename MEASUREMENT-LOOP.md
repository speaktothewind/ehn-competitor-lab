# Measurement Loop — Lab Recipe Attribution to Engagement

**Purpose:** Connect published posts to their Lab recipe/archetype sources and measure which patterns drive engagement.

**Current week:** 2026-06-08 to 2026-06-14 (7 posts scheduled in Zernio)

---

> ## ⚙️ AUTOMATED NOW (2026-06-05) — read this first
>
> The data-handoff steps further down (Lab manually fills `published-posts.json` URLs on Sunday; "pull engagement from Apify"; pbcopy → paste between chats) are **SUPERSEDED**. The clinic pipeline now does both writes automatically and pushes them into this repo. Treat the sections below as *conceptual reference* (attribution types, decision rule, analysis), not the operational procedure.
>
> **What's automated:**
> - **Engagement + permalinks source = Zernio's native `/analytics` + `/posts` API** (NOT Apify — Apify only feeds the Lab's *outbound* weekly-plan/patterns). Zernio `/analytics` covers Facebook + Instagram only; **GBP engagement is unavailable** (gets a permalink, no metrics).
> - **The pipeline owns both writes.** `tools/lab_results_push.py` (in the Social Media Pipeline repo) fills `published-posts.json` (permalink + posted_at) and `recipe-performance.json` (per-platform metrics at a +7d snapshot), then commits + pushes here. The Lab no longer hand-fills URLs.
> - **Cadence:** a recurring pipeline task (`lab-results-push-weekly`, Mondays) runs `lab_results_push.py --auto`. For week 06-08 it fills permalinks Mon 06-15 and the +7d engagement snapshot Mon 06-22 — same dates the two retired one-off tasks used to target.
> - **Lab's only job:** seed `published-posts.json` + `recipe-performance.json` with the week's attribution (type / source / modelled_on) so the pipeline has rows to fill. A `week`-match guard means the pipeline only writes a file whose `week` matches the due week.
> - **Judge the experiment on the Lab's ×median outlier (primary) + ENG (secondary), not engagement-rate** — the sample is too small for rate precision.

---

## The Challenge

Not all posts are 1:1 Lab recipe adoptions. Three attribution types exist:

| Type | Example | Meaning |
|------|---------|---------|
| **Full recipe** | Slot 8 (sleep carousel) | Design recipe + copy reworked to EHN voice. Full fidelity to Lab pattern. |
| **Archetype** | Slot 4 (myth-bust format) on 2 different topics | Format + hook pattern borrowed from Lab. Topic differs. |
| **Format pattern** | Pivot library carousels, listicles | General format from experiment pivot library. EHN-original topic + copy. No single-slot attribution. |

**Why it matters:** If you measure "recipe X drove Y engagement" without distinguishing type, you get muddied signal. Archetype success might mean "the myth-bust format works," not "the slot 4 recipe works." Format pattern success might mean "EHN topics selected well," not "the Lab patterns are strong."

---

## Files You Have

### `published-posts.json`
Maps 7 published posts (Mon–Sun) to their Lab attribution type. Links to post URLs (null until posts go live).

**Fill in:** Post URLs on Sun 06-14 (when all 7 are live on IG/FB).

### `recipe-performance.json`
Template for engagement results. Structured by attribution type for clean analysis.

**Fill in:** Automated — the pipeline's `lab_results_push.py` populates the `engagement` sections from Zernio `/analytics` at the +7d snapshot (Mon 06-22 for this week). No manual Apify pull.

---

## The Process (Week by Week)

### Baseline Control (Reference)

Three weeks of branded-card system (pre-pivot) are the control arm:
- **05-18, 05-25, 06-01:** Pillow branded cards (infographic, photo-heading, question-card, cta-card)
- Locked pillar rotation: Mon=Ed · Tue=Trust · Wed=Ed · Thu=Eng · Fri=Ed · Sat=Trust · Sun=Conv
- **File:** `baseline-control.json` (all posts, topics, formats documented)
- **Pipeline pulls engagement for these weeks using the same Zernio method** as the pivot week

**Decision rule:** Pivot (2026-06-08 to 06-14) must beat baseline to justify permanence. If pivot underperforms branded cards, format system rolls back. This is Rohan's call, logged in decisions/log.md.

### Week 1: Posts Go Live (Mon 2026-06-08 → Sun 2026-06-14)

**Your pipeline:**
- Schedules posts via Zernio (already done)
- Posts fire each day

**Lab's job on Sun 2026-06-14:**
- Receive permalinks from pipeline's Zernio `/analytics` pull
- Update `published-posts.json` with `platformPostUrl` for all 7 posts
- Commit and push

### Week 2: Measurement (Mon 2026-06-22, +7 days post-publication)

**Pipeline's job:**
- Pull engagement metrics from Zernio `/analytics` for the 7 pivot posts (Mon 06-08 → Sun 06-14)
- Pull engagement metrics from Zernio for baseline weeks (05-18, 05-25, 06-01) using the same method
- **Snapshot at +7 days** (equal age across all posts) to avoid cumulative engagement bias
- Match each post to its entry in `published-posts.json` (by URL)
- Populate `recipe-performance.json` with engagement data (snapshot_date, days_post_publish, per-platform metrics)

**Analysis:**
```
Full recipe (slot 8):     sleep carousel → X likes/comments/shares
Archetype (slot 4 ×2):    myth-bust format on 2 topics → Y avg engagement
Format pattern (4 posts): pivot library formats → Z avg engagement
```

**Signal extraction:**
- Did full recipe beat archetype? (fidelity matters)
- Did archetype beat format pattern? (borrowing format is meaningful)
- Did specific topics in format pattern outperform others? (topic selection signal)

---

## Implementation

### Step 1: Update `published-posts.json` (Lab, Sun 06-14)

```bash
# Once posts are live, fill in the nulls:
# For each day, add:
# - platform.facebook.url = "https://facebook.com/..."
# - platform.instagram.url = "https://instagram.com/p/..."
# - platform.googlebusiness.url = "https://business.google.com/..."
# - posted_at timestamps
```

### Step 2: Update `recipe-performance.json` (Pipeline, 2026-06-21)

```bash
# Pull EHN posts from Apify for week 06-08 to 06-14
# For each post in published-posts.json:
#   - Find matching post in Apify results (by URL)
#   - Extract likes, comments, shares
#   - Store in recipe-performance.json engagement section
# Run analysis section at the end
```

### Step 3: Feed Back to Lab (Optional, Next Iteration)

Once you have one week's data, the Lab can refine:
- If `full_recipe > archetype`, emphasize design fidelity in next week's recipes
- If `archetype > format_pattern`, emphasize archetype borrowing over topic selection
- If specific topics in `format_pattern` stand out, seed next Lab run with winning topics

---

## Data Handoff Timeline

| Date | Owner | Action |
|------|-------|--------|
| Sun 2026-06-14 | Lab | Pull post URLs, update published-posts.json, hand to pipeline |
| Mon 2026-06-22 | Pipeline (auto) | `lab-results-push-weekly` pulls +7d engagement from Zernio `/analytics`, writes + pushes recipe-performance.json |
| Thu 2026-06-26+ | Lab (optional) | Analyze results, weight next week's recipe selection |

---

## FAQ

**Q: What if a post URL is wrong?**
A: Fix it in `published-posts.json` and re-pull engagement data.

**Q: What if Zernio hasn't synced the post yet?**
A: `lab_results_push.py` is idempotent — the next weekly run re-pulls and fills any rows still missing. Engagement is snapshotted at +7d, by which point Zernio has synced.

**Q: Do we measure GBP engagement separately?**
A: Yes, GBP has its own `views` metric (not likes/comments/shares). Capture it if available, but note it's not directly comparable to FB/IG.

**Q: Should we measure by platform (FB vs IG vs GBP)?**
A: Yes. Store separately, then decide: analyze per-platform or aggregate? (Aggregation simplifies; per-platform catches platform-specific patterns.)

**Q: When does the Lab see the results?**
A: After pipeline populates recipe-performance.json on 2026-06-19. Lab can refine next week's selection for the Thu 2026-06-26 pipeline run.

---

## Next Steps (You + Pipeline Chat)

1. Agree on who fills in published-posts.json post-URLs (Lab) and who pulls engagement (Pipeline)
2. Confirm the date Apify data is ready (7+ days after posting)
3. Decide: analyze per-platform or aggregated?
4. Once you have 2–3 weeks of data, discuss whether to feed results back into Lab's pattern weighting
