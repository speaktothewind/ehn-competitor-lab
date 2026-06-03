# AU Competitor Shortlist — Functional Medicine / Gut / Naturopathy

Australia-only competitor research for EHN. **Niche scope:** gut, SIBO, functional medicine, thyroid/autoimmune, methylation/MTHFR, fatigue, mould/toxins. **Deliberately excluded:** women's hormones / fertility, paediatric, and pure product brands (per Rohan, Jun 2026).

## How to read the numbers
- **IG followers** = current, from the Instagram profile (reliable).
- **Engagement (ER · avg likes)** = from StarNgage analytics. **Indicative only** — StarNgage samples lag (its follower counts ran 10–25% below current IG), and the very low figures (e.g. Lucy Rose ~5 likes) should be sanity-checked. **Exact average engagement comes from the first Apify scrape** — that's literally what the dashboard computes.
- Accounts marked *not in StarNgage* are below the analytics-coverage threshold (small) — that absence is itself a low-presence signal.

## The key finding
Follower count is misleading in this niche. Across the board, **AU functional-medicine engagement is low (mostly 0.1–1%)**, and several big-follower accounts are near-dead on engagement (Lucy Rose ~43K followers / ~5 likes; Lee Holmes ~58K / ~130 likes). The standouts on *engagement* are **Sarah Di Lorenzo (1.05%)** and **Reece Carter (0.7%)**. This is why the dashboard scores each post against its own account's median — and it's a strategic opening: the bar for *engaging* AU content in your lane is low.

---

## Master table (ranked by overall presence)

| # | Account | Niche | Instagram | IG followers | IG engagement (ER · avg likes) | Facebook | FB size | Verdict |
|---|---------|-------|-----------|-------------|-------------------------------|----------|---------|---------|
| 1 | **Sarah Di Lorenzo** | Clinical nutrition / gut / general | `sarah_di_lorenzo` | ~63K | **1.05% · ~287** ⭐ | `sarahdilorenzoclinicalnutritionist` | ~52K | TRACK — best reach+engagement (mainstream/TV) |
| 2 | **Reece Carter** (Herb Nerd) | Gut, herbal medicine | `herbnerdreece` | ~40K | **0.7% · ~263** ⭐ | — *(no active FB)* | — | TRACK — best practitioner engagement; IG-only |
| 3 | **Lee Holmes** (Supercharged Food) | Gut, anti-inflammatory, autoimmune | `leesupercharged` | ~58K | 0.25% · ~130 | `LeeSupercharged` | ~12K | TRACK — big reach, weak engagement |
| 4 | **Cyndi O'Meara** | Wholefoods / gut | `cyndiomeara` | ~37K | ~0.5–3% (est. from posts) | `cyndiomeara` | ~6.9K | TRACK — good reach; positioning a bit fringe (anti-wheat) |
| 5 | **The Healthy Gut** (Rebecca Coomes) | SIBO / gut | `the.healthy.gut` | ~32K | 0.3% · ~17 | `Rebecca.Coomes.Author` | 655 | MAYBE — moderate IG, weak engagement, tiny FB |
| 6 | **Dr Vincent Candrawinata** | Gut / inflammation | `askdrvincent` | ~26K | not in StarNgage | `AskDrVincent` | — | MAYBE — decent reach; brand-adjacent (Renovatio) |
| 7 | **Dr Nirala Jacobi** (SIBO Doctor) | SIBO / gut | `dr.nirala.jacobi_thesibodoctor` | ~15K | 0.18% · ~11 | `thesibodoctor` (+ clinic `thebiomeclinic`) | — | TRACK — top SIBO authority; low public engagement |
| 8 | **The Lucy Rose Clinic** | Thyroid / autoimmune | `thelucyroseclinic` | ~43K | **0.09% · ~5** 🚩 | `TheLucyRoseClinic` | — | CAUTION — big followers, near-dead engagement (likely inflated) |
| 9 | **Anthia Koullouros** | Naturopath / gut / holistic | `anthia.koullouros.naturopath` | ~10K | 0.6% · ~53 | `Anthia.Koullouros.Naturopath` | — | TRACK — small but genuine engagement |
| 10 | **Dr Ron Ehrlich** | Holistic / toxins / integrative | `drronehrlich` | ~6K | 0.58% · ~34 | `Doctor.RonEhrlich` | — | MAYBE — credible holistic voice, small |
| 11 | **Damian Kristof** | Naturopath / longevity / general | `damiankristof` | ~3.4K | not in StarNgage | `damiankristofpage` | ~2.2K | MAYBE — big media profile, small social |
| 12 | **Dr Michelle Woolhouse** (Holistic GP) | Integrative GP | `dr.michellewoolhouse` | ~3.5K | not in StarNgage | `theholisticgp` | — | MAYBE — small social |
| 13 | **Nicole Bijlsma** | Mould / toxins / healthy home | `homehealthdoc` | small (~10 likes/post) | not in StarNgage | `nicolebijlsma1` | — | MAYBE — niche-valuable (mould), small presence |
| 14 | **Kirsty Wirth** (Kultured Wellness) | Gut / microbiome | `that_gut_feeling_au` | small | not in StarNgage | `kulturedwellness` | — | MAYBE — small presence |
| 15 | **AF Health** ⭐ (Adelaide) | Gut / fatigue / thyroid | `afhealth.naturopath` | 929 | very low | `AF.Health.Adelaide` | 623 | TRACK as *local* intel only — tiny, but same city |
| R1 | **Tania Flack** | Naturopath / gut | `taniaflack` | small (~14 likes) | not in StarNgage | `taniaflack.naturopath` | — | RESERVE — small |
| R2 | **AUSCFM** (Aust. Centre for FM) | FM clinic (Perth) | `functionalmedicineaustralia` | small | not in StarNgage | `functionalmedicineaustralia` | — | RESERVE — small presence |

## Methylation / MTHFR note
This sub-niche is dominated by **two accounts you already track**: Carolyn Ledowsky / **MTHFR Support Australia** (`mthfrsupportglobal`) and **Denise Furness** (`drdenisefurness`). No third AU methylation account with meaningful presence was found — so methylation coverage is already as good as the AU market allows.

---

## The 15 + 15 (ready for Apify)

**15 Instagram** (`directUrls`):
```
https://instagram.com/sarah_di_lorenzo
https://instagram.com/herbnerdreece
https://instagram.com/leesupercharged
https://instagram.com/cyndiomeara
https://instagram.com/the.healthy.gut
https://instagram.com/askdrvincent
https://instagram.com/dr.nirala.jacobi_thesibodoctor
https://instagram.com/thelucyroseclinic
https://instagram.com/anthia.koullouros.naturopath
https://instagram.com/drronehrlich
https://instagram.com/damiankristof
https://instagram.com/dr.michellewoolhouse
https://instagram.com/homehealthdoc
https://instagram.com/that_gut_feeling_au
https://instagram.com/afhealth.naturopath
```

**15 Facebook** (`startUrls`) — Reece Carter has no FB, so his slot is filled by Tania Flack:
```
https://facebook.com/sarahdilorenzoclinicalnutritionist
https://facebook.com/LeeSupercharged
https://facebook.com/cyndiomeara
https://facebook.com/Rebecca.Coomes.Author
https://facebook.com/AskDrVincent
https://facebook.com/thesibodoctor
https://facebook.com/TheLucyRoseClinic
https://facebook.com/Anthia.Koullouros.Naturopath
https://facebook.com/Doctor.RonEhrlich
https://facebook.com/damiankristofpage
https://facebook.com/theholisticgp
https://facebook.com/nicolebijlsma1
https://facebook.com/kulturedwellness
https://facebook.com/AF.Health.Adelaide
https://facebook.com/taniaflack.naturopath
```

## If you only want the high-presence core (recommended)
Track these ~7 first — the ones that actually clear the presence bar: **Sarah Di Lorenzo, Reece Carter, Lee Holmes, Cyndi O'Meara, Dr Nirala Jacobi, Anthia Koullouros**, plus **AF Health** for local Adelaide intel. Add the rest later once the dashboard confirms which are worth the slots.

## Dashboard AU tagging (wiring note)
When these are added, their rows must tag as region `au` in `index.html` (the `AUSET` array). IG rows key off the handle (predictable); **FB rows key off the scraped `pageName`, which differs from the URL slug** — so after the first FB scrape, confirm the actual `pageName` values and add those (lowercased) to `AUSET`. Easiest path: add all IG handles now, then reconcile FB page names after run one.

## Caveats
- Follower/engagement figures are point-in-time (Jun 2026) and from public sources; treat as indicative for filtering, not exact.
- StarNgage follower samples lagged current IG by 10–25% on several accounts — current IG figures are shown above as primary.
- A few FB pages couldn't have their like-counts confirmed (`—`); these resolve on the first scrape.
