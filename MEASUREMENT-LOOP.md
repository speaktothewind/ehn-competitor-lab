# Measurement Loop — Lab Recipe Attribution to Engagement

**Purpose:** Connect published posts to their Lab recipe/archetype sources and measure which patterns drive engagement.

**Current week:** 2026-06-08 to 2026-06-14 (7 posts scheduled in Zernio)

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

**Fill in:** On 2026-06-21 (7+ days after posting), pull engagement metrics from Apify and populate `engagement` sections.

---

## The Process (Week by Week)

### Week 1: Posts Go Live (Mon 2026-06-08 → Sun 2026-06-14)

**Your pipeline:**
- Schedules posts via Zernio (already done)
- Posts fire each day

**Lab's job on Sun 2026-06-14:**
- Pull live IG/FB permalinks for all 7 posts
- Update `published-posts.json` with post URLs
- Hand both JSON files to pipeline chat

### Week 2: Measurement (Thu 2026-06-19)

**Pipeline's job:**
- Pull EHN's posts from Apify (you already do this)
- Extract engagement metrics (likes, comments, shares) for the 7 posts published Mon–Sun 06-08 to 06-14
- Match each post to its entry in `published-posts.json` (by URL)
- Populate `recipe-performance.json` with engagement data

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
| Thu 2026-06-19 | Pipeline | Pull engagement from Apify, populate recipe-performance.json |
| Thu 2026-06-26+ | Lab (optional) | Analyze results, weight next week's recipe selection |

---

## FAQ

**Q: What if a post URL is wrong?**
A: Fix it in `published-posts.json` and re-pull engagement data.

**Q: What if Apify doesn't have the post yet?**
A: Pull on 2026-06-21 or later (7+ days after posting ensures data is in the system).

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
