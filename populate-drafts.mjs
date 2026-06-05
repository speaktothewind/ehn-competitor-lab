import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('./weekly-plan.json', import.meta.url);
const plan = JSON.parse(readFileSync(path, 'utf8'));

// Finished copy, keyed by slot. on_image omitted where the slot already has it
// (slots 7 & 9) or is text-only (slot 4).
const drafts = {
  1: {
    on_image:
`Card 1 (cover): "Thyroid* — you're not imagining it."  (*"Thyroid" in EHN green italic)
Card 2: "Exhausted by 3pm. Cold when no one else is."
Card 3: "Brain fog. Thinning hair. Weight that won't shift."
Card 4: "A 'normal' TSH doesn't always mean a happy thyroid."
Card 5: "Let's look at the full picture. — Elemental Health & Nutrition"`,
    caption:
`You're not imagining it.

The 3pm exhaustion. Feeling cold when everyone else is fine. The brain fog, the thinning hair, the weight that won't budge no matter what you do.

These symptoms get waved away too often as "just stress" or "just getting older" — and many people are told their thyroid is "normal." But a single TSH inside the lab range doesn't always mean your thyroid is working for you. We look wider: free T3, free T4, reverse T3 and thyroid antibodies, and how it all fits with your iron, your gut and your stress load.

If this sounds like you, it's worth investigating properly. You don't have to keep pushing through. 💚

— The team at Elemental Health & Nutrition, Adelaide

#thyroidhealth #hypothyroidism #functionalmedicine #adelaidehealth #hashimotos #womenshealth #naturopathadelaide`,
    gmb_caption:
`Tired, cold, foggy — and told your thyroid is "normal"? A single TSH reading doesn't always tell the whole story. At Elemental Health & Nutrition in Adelaide, we run a fuller thyroid picture — free T3, free T4, reverse T3 and antibodies — and look at how it connects with your iron, gut and stress. If this sounds like you, book a consult. 💚`,
  },

  2: {
    on_image:
`Hook frame: "WHAT'S HIDING IN YOUR HOME?"  ("HOME" in EHN green italic)

Script outline (30–45 sec):
1. Hook (0–3s): Clinician holds a clear jar (water / household sample). Text: "What's hiding in your home?"
2. Reveal (3–20s): "Mould spores, VOCs from new furniture, microplastics in your drinking water — most of it you'll never see or smell."
3. Reassure (20–35s): "It doesn't mean panic. It means a few simple checks: ventilation, water filtering, and testing if symptoms persist."
4. CTA (35–45s): "Unexplained fatigue, headaches or brain fog at home? Let's investigate."`,
    caption:
`What's hiding in your home? 🏠

Most of the things that quietly affect how we feel indoors are invisible — mould spores behind walls and in bathrooms, VOCs off-gassing from new furniture and paint, and microplastics in our drinking water.

This isn't about fear or throwing out everything you own. It's about a few sensible steps:
• Ventilate daily — especially bathrooms, kitchens and bedrooms
• Address any visible mould or damp early
• Filter your drinking water
• If fatigue, headaches or brain fog persist at home, it's worth testing rather than guessing

Your environment is part of your health picture. If something at home feels off, let's work out why.

— Elemental Health & Nutrition, Adelaide

#mould #microplastics #environmentalhealth #functionalmedicine #adelaidehealth #indoorairquality`,
    gmb_caption:
`Unexplained fatigue, headaches or brain fog that's worse at home? Invisible factors — mould, VOCs from furniture, and microplastics in drinking water — can all play a part. At Elemental Health & Nutrition in Adelaide, we help you investigate environmental drivers rather than guess. Book a consult to look into it properly.`,
  },

  3: {
    on_image:
`The way you were fed still shapes you.

Long before we had labels for it, the people who raised us were often practising functional nutrition without knowing it — slow-cooked broths, fermented vegetables, whole foods grown close to home, meals shared without rushing.

We've inherited more than recipes. The patterns we grew up with help shape our gut bacteria, our stress response, and our lifelong relationship with food.

Honouring that wisdom doesn't mean ignoring the science — the two sit beautifully together. Often the most evidence-based advice is also the oldest: eat real food, eat it slowly, and share it with people you love.`,
    caption:
`The way you were fed still shapes you. 🥣

Long before we had labels for it, the people who raised us were often practising functional nutrition without knowing it — slow-cooked broths, fermented foods, whole ingredients, meals eaten slowly and shared.

We inherit more than recipes. Early eating patterns help shape our gut microbiome, our stress response and our lifelong relationship with food.

Honouring that wisdom doesn't mean ignoring the science — they sit together. Often the most evidence-based advice is also the oldest: eat real food, eat it slowly, share it with people you love.

What's one food tradition from your family you still keep? 💚

— Elemental Health & Nutrition, Adelaide

#nutrition #guthealth #functionalmedicine #wholefoods #adelaidehealth`,
    gmb_caption:
`Often the most evidence-based nutrition advice is also the oldest: eat real food, eat it slowly, and share it. At Elemental Health & Nutrition in Adelaide, we blend that inherited wisdom with functional testing to build nutrition plans that actually fit your life. Book a consult to get started.`,
  },

  4: {
    // text-only Facebook post — no graphic, so no on_image
    caption:
`Your GP probably isn't talking to you about this.

Not because they don't care — but because a standard appointment doesn't have time for the slow, everyday chemical load most of us carry. And it adds up.

A few things worth knowing about the average home:
• "Fragrance" on a label can legally hide dozens of undisclosed chemicals — candles, plug-ins and air fresheners included.
• Non-stick cookware and some food packaging are common sources of PFAS ("forever chemicals").
• Plastic containers shed microplastics — especially when heated.
• New furniture, paint and flooring off-gas VOCs for weeks to months.

This isn't about fear or a 12-step detox. The body detoxifies constantly — our job is to lighten the load it has to deal with:
→ Ventilate your home daily
→ Swap to glass or stainless for food storage and reheating
→ Filter your drinking water
→ Choose fragrance-free where you can
→ Support the basics: fibre, cruciferous veg, hydration, sleep

If you've got persistent fatigue, headaches or brain fog and can't find the cause, your environment is worth investigating.

— Elemental Health & Nutrition, Adelaide`,
    gmb_caption:
`Persistent fatigue, headaches or brain fog with no clear cause? Your everyday environment — fragrance chemicals, PFAS, microplastics, VOCs — may be adding to the load. It's not about fear or extreme detoxes; it's about sensible swaps and, when needed, proper testing. Book a consult with Elemental Health & Nutrition, Adelaide.`,
  },

  5: {
    on_image:
`Slide 1 (cover): "Five practices* I recommend to my own patients."  (*"practices" in EHN green italic)
   Subline: "Each takes 5 minutes. Backed by research. None is a detox."
Slide 2: "Protein at breakfast." — "~30g steadies blood sugar and appetite for hours."
Slide 3: "Walk after meals." — "Even 10 minutes blunts the post-meal glucose spike."
Slide 4: "Veg & protein before carbs." — "Same meal, gentler curve."
Slide 5: "Morning daylight." — "Sets the rhythms that govern insulin sensitivity."
Slide 6: "Protect your sleep." — "One short night worsens glucose control the next day."`,
    caption:
`Five things I recommend to my own patients for steadier blood sugar — each takes about 5 minutes, and none of them is a detox. 👇

1. Protein at breakfast. Aiming for ~30g steadies blood sugar and curbs the mid-morning crash.
2. Walk after meals. Even 10 minutes helps your muscles soak up glucose and blunts the spike.
3. Eat veg and protein before carbs. Same meal, gentler curve.
4. Get daylight early. Morning light helps set the rhythms that govern insulin sensitivity.
5. Protect your sleep. One short night measurably worsens how your body handles glucose the next day.

None of these are dramatic. That's the point — small, repeatable, evidence-based. Pick one and start tomorrow. 💚

Which one will you try first?

— Elemental Health & Nutrition, Adelaide

#bloodsugar #insulinresistance #functionalmedicine #nutrition #adelaidehealth #metabolichealth`,
    gmb_caption:
`Five simple, research-backed habits for steadier blood sugar: protein at breakfast, a short walk after meals, veg and protein before carbs, morning daylight, and protecting your sleep. Small changes, real results. For a plan tailored to your labs and lifestyle, book a consult with Elemental Health & Nutrition, Adelaide.`,
  },

  6: {
    on_image:
`Header box (top-right): "GUT TRIGGERS"
Tier 1 (top): "SIBO* — the overlooked trigger"  (*"SIBO" in EHN green)
   "Bloating that worsens through the day? It may not be 'just IBS.'"
Tier 2: "Common triggers — onion, garlic, excess high-FODMAP veg"
Tier 3: "Worth testing — a breath test gives real answers, not guesswork"
Tier 4: "Gentle supports — bone broth, cooked low-FODMAP veg, slow meals"
Tier 5 (base): "Rebuild — fibre, fermented foods, diversity (when ready)"`,
    caption:
`Bloated by the afternoon no matter what you eat? It might not be "just IBS." 🌀

SIBO (small intestinal bacterial overgrowth) is one of the most overlooked drivers of bloating, gas and irregular digestion — and the frustrating part is that it often hides behind a general IBS label for years.

The good news: you don't have to guess. A simple breath test can give you real answers, and from there the plan becomes targeted instead of trial-and-error.

Want our plain-English guide to the SIBO breath test and what to do next? Comment "GUT" below and we'll point you to it. 💚

— Elemental Health & Nutrition, Adelaide

#sibo #guthealth #bloating #ibs #functionalmedicine #adelaidehealth`,
    gmb_caption:
`Bloated by the afternoon no matter what you eat? It might not be "just IBS." SIBO is a commonly missed driver of bloating and gas — and a simple breath test can give real answers instead of guesswork. At Elemental Health & Nutrition in Adelaide, we test properly and build a targeted plan. Book a consult.`,
  },

  7: {
    // on_image already present in plan — preserved
    caption:
`You like to think you're in charge of your decisions. Your gut might disagree. 🧠

The trillions of microbes living in your gut don't just digest food — they help produce around 90% of your body's serotonin and are in constant two-way conversation with your brain via the vagus nerve. They influence your mood, your cravings, your stress resilience, even how you weigh up risk.

It's why "a gut feeling" is more literal than we realised — and why looking after your microbiome isn't only about digestion. Feed it well (fibre, plants, fermented foods, less ultra-processed), and you're supporting how you think and feel too.

Your second brain is always listening. 💚

— Elemental Health & Nutrition, Adelaide

#guthealth #microbiome #gutbrain #mentalhealth #functionalmedicine #adelaidehealth`,
    gmb_caption:
`Your gut does more than digest — it's in constant dialogue with your brain, influencing mood, cravings and stress. Caring for your microbiome supports how you think and feel, not just digestion. At Elemental Health & Nutrition in Adelaide, we help you understand and improve your gut–brain health. Book a consult.`,
  },

  8: {
    on_image:
`Slide 1 (cover): "Sleep quality drives longevity*."  (*"longevity" in EHN green italic)
Slide 2: "It's not just the hours — it's the depth."
Slide 3: "Deep sleep is when your body repairs, clears the brain, and resets the nervous system."
Slide 4: "Poor sleep is linked with higher cardiovascular and metabolic risk over time."
Slide 5: "Start with sleep hygiene. — Elemental Health & Nutrition"`,
    caption:
`We obsess over the latest longevity supplement — and overlook the most powerful (and free) tool we have: deep sleep. 😴

And it's not just about the hours. It's about quality. Deep sleep is when your body does its repair work — clearing metabolic waste from the brain, regulating blood sugar and blood pressure, and settling your nervous system out of "fight or flight."

Consistently poor sleep is linked with higher cardiovascular and metabolic risk over time. The encouraging part: sleep is one of the most changeable levers you have.

Start simple:
• Consistent wake time, even weekends
• Morning daylight, dim evenings
• No screens for the last hour
• Cool, dark, quiet room

No fancy stack required — just better sleep, more often. 💚

— Elemental Health & Nutrition, Adelaide

#sleep #longevity #functionalmedicine #nervoussystem #adelaidehealth`,
    gmb_caption:
`The most powerful longevity tool isn't a supplement — it's deep sleep. It's when your body repairs, regulates blood sugar and settles your nervous system. Poor sleep is linked with higher long-term health risk, but it's also one of the most changeable. At Elemental Health & Nutrition, Adelaide, we help you get to the root of poor sleep. Book a consult.`,
  },

  9: {
    // on_image already present in plan — preserved
    caption:
`"I just want to be able to walk without thinking about it."

We hear this often. Knee pain, a dodgy hip, an old injury — and slowly walking becomes something you brace for instead of enjoy. The world gets smaller.

Here's the hopeful part: walking is one of the most powerful things you can do for your joints, heart, blood sugar and mood — and pain doesn't always mean "stop." Often it means "let's look at how you're moving." With a proper movement assessment and functional rehab, we can frequently rebuild strength, confidence and range — step by step.

Movement is medicine. Sometimes you just need the right starting point. 💚

If walking feels harder than it should, let's work out why.

— Elemental Health & Nutrition, Adelaide

#movementismedicine #walking #functionalmedicine #jointpain #adelaidehealth`,
    gmb_caption:
`Knee or hip pain turning walking into something you brace for? Pain doesn't always mean stop — often it means let's look at how you're moving. At Elemental Health & Nutrition in Adelaide, a movement assessment and functional rehab can help rebuild strength and confidence, step by step. Book a consult.`,
  },

  10: {
    on_image:
`Headline: "Your gut is listening*."  (*"listening" in EHN green italic)
Subline: "Here's what the science says."
• Stress signals → vagal tone drops
• Poor digestion → nervous system stays switched on
• Tight shoulders, shallow breathing → the loop continues
• Gut imbalance → inflammation rises
• Heal the gut → the vagus settles
Thesis: "Your nervous system and microbiome are in constant dialogue. Tend to one, you support the other."`,
    caption:
`"It's all in your head" is one of the least helpful things anyone with gut and mood symptoms gets told. Here's what the science actually says. 🧠💚

Your gut and your nervous system are wired together by the vagus nerve — a two-way line that's always on:
• When you're chronically stressed, vagal tone drops and digestion suffers
• When digestion struggles, the nervous system stays switched on
• Gut imbalance raises inflammation, which affects mood
• And when you heal the gut and calm the system, the vagus settles — and both improve

So no, it's not "just in your head." It's in the constant dialogue between your gut and your brain. The encouraging part: that means there are real, physical levers to work with — breathwork, sleep, blood sugar, fibre and a healthier microbiome.

Your gut is always listening. Let's give it something good to hear. 💚

— Elemental Health & Nutrition, Adelaide

#gutbrain #vagusnerve #mentalhealth #guthealth #functionalmedicine #adelaidehealth`,
    gmb_caption:
`Gut symptoms and low mood often travel together — and it's not "just in your head." Your gut and brain are wired by the vagus nerve in constant two-way dialogue, so tending to one supports the other. At Elemental Health & Nutrition in Adelaide, we work on both. Book a consult to learn more.`,
  },
};

let updated = 0;
for (const post of plan.posts) {
  const d = drafts[post.slot];
  if (!d) continue;
  if (d.on_image && !post.on_image) post.on_image = d.on_image;
  post.caption = d.caption;
  post.gmb_caption = d.gmb_caption;
  updated++;
}

plan.dry_run = false;
plan.drafted_at = '2026-06-04';

writeFileSync(path, JSON.stringify(plan, null, 2) + '\n', 'utf8');
console.log(`Populated ${updated} posts with caption + gmb_caption (+ on_image where missing).`);
