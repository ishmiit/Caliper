# CALIPER — FRONTEND BUILD PROMPT

> Paste the block below into v0, Lovable, Bolt, or Cursor.
> Notes on how to use it are at the bottom of this file, after the prompt.

---

## THE PROMPT — copy from here

Build the frontend for **Caliper**, a resume shortlisting engine that shows its work. This is a hackathon demo that will be judged live in three minutes, so it must be visually striking on first sight and completely legible at data density. Use React + Tailwind + framer-motion. Mock all data — I will wire the real engine myself.

### The concept

Two surfaces, and the cut between them is the point.

**The Chamber** is true black. It is a theater blackout, not "dark mode." Enormous type, almost no content, cinematic restraint. This is the first 25 seconds of a live pitch.

**The Console** is bone white. It is an examination surface — dense, precise, instrument-grade.

Between them, a hard cut: black inverts to bone in 400ms with no crossfade. That inversion is the emotional peak of the product. Design everything around making it land.

### Design tokens — exactly four colors, no accent color

```
--void:    #000000   Chamber ground
--bone:    #F2EFE9   Console ground; type color on the Chamber
--ink:     #14140F   Console type
--azurite: #2B4FD8   Machine-inferred evidence ONLY
```

Supporting neutrals derived from these only: `#585850` `#8C8879` `#C9C4B7` `#DEDAD0`.

**Do not add an accent color.** Near-black plus one bright acid-green, cyan, or vermilion accent is the most common cliché in dark interfaces and I do not want it. Boldness gets spent in exactly one place, described below.

### The verdict system is the palette

Four evidence states. Visual weight maps directly to evidential weight — this is information encoding, not decoration.

| State | Treatment | Meaning |
|---|---|---|
| Confirmed | Solid ink fill / 2px solid ink rule | Stated by the candidate and corroborated |
| Stated | Ink outline, solid hairline | Claimed, not corroborated |
| Inferred | Azurite, 2px solid azurite rule | Derived by the machine, not written by the candidate |
| Missing | Hollow. 1px dashed `#B0AB9C`, no fill | Absence rendered as absence — never a red alert |

### Where the boldness goes

One candidate in the ranked list is a "hidden gem" — someone a keyword-only ATS would have rejected. **That single row inverts**: solid black block, bone type, inside the otherwise bone-white console. Nothing else on any screen inverts. It should be impossible to miss and it costs no new color.

### Typography

One family: **Archivo** (variable, Google Fonts). Work it hard across its weight axis.

- Chamber display: 900 weight, `letter-spacing: -0.035em`, roughly 40–44px, `line-height: 1.08`
- Console body: 400, 12.5–13.5px
- Labels: 500
- **Every number uses `font-variant-numeric: tabular-nums`** — scores, ranks, counters, metrics. Non-negotiable; misaligned figures destroy the instrument feel.

No monospace anywhere. No all-caps except the four-or-five-character section markers (`BRIEF`, `READING`, `CALIPER`) at 11px with `letter-spacing: 0.1em`.

### Screen 1 — Chamber

Full-bleed black. A single held statement in bone, max-width ~520px, upper-left:

> Eleven thousand applications a minute. Nobody can explain one of them.

Render the second sentence in `#585850` so the statement has two tonal registers.

Bottom of screen: a dropzone as a 0.5px **dashed** hairline rectangle in `#4A4A44`, label "Drop the brief and the pool" in `#8C8C84` at 13px. Bottom right: the wordmark `CALIPER` at 11px, `letter-spacing: 0.16em`, in `#585850`.

Nothing else on this screen. The confidence comes from refusing to fill it. This is a single held frame, **not** a scroll narrative — do not build scroll chapters.

### Screen 2 — Analysis

Still black. Full-screen telemetry. Seven lines type themselves in sequence, roughly 180ms apart, label left in `#8C8C84`, value right in bone at 500 weight with tabular figures:

```
parsing documents              18 / 18
section headers recovered      71
evidence chunks extracted      342
embedding · local · 384d       1.24s
requirements decomposed        12
scoring pairs                  216
calibrating against cohort     σ 0.19
```

A 2px progress rule along the bottom fills bone over `#2A2A26`. Under it, in `#585850` at 11.5px: "no data leaves this machine".

This is the one place in the product where non-user-triggered motion is allowed. Make it good.

### Screen 3 — The cut

On completion: black → bone in 400ms. **Hard cut, not a crossfade.** Consider a 60ms beat of pure white before the bone lands. The console's content should already be composed underneath so it appears whole rather than assembling.

### Screen 4 — Console

Bone ground. Top instrument bar with a hairline `#C9C4B7` bottom border: wordmark left; on the right, two toggles reading `keyword on` / `semantic on`, and a live `nDCG 0.91` readout.

Three panes below, split by hairline rules — no cards, no shadows, no rounded corners:

**Left, ~172px — the pool.** Seven ranked rows: rank number in `#8C8879`, name, score right-aligned and tabular. Rows fade in tonal weight as rank descends (ink → `#8C8879` → `#B8B4A6`) so the eye reads the shortlist shape instantly. Row 02 is the inverted hidden-gem row and carries a small `GEM ↑13` marker.

**Center, flexible — the reading.** The evidence trail for the selected candidate. Each requirement: an id and title in ink at 500 weight, then the quoted resume line inside a left border colored by verdict (ink for confirmed, azurite for inferred), then a metadata line — `inferred · 1 hop · line 42 · 0.81`. Below inferred matches, an explanatory line in `#6E6C60`: "Node.js never stated. Express implies it. Capped at 0.65 credit."

**Right, ~122px — the brief.** Twelve requirement chips as 13px squares in a wrapping grid, each filled by its verdict state. A three-item legend below. This is a compact glyph of overall coverage, not a list.

### Screen 5 — Redline

The job description rendered as a document with margin comments, exactly like Word track changes. Flagged phrases carry a `#E4DFD2` highlight. An accepted edit shows a strikethrough with `text-decoration-color: var(--azurite)`.

Right margin, ~196px, comment cards with a 2px left border and no other chrome:

- **Experience on an internship** — "Excludes 4 of 18 candidates in this pool." — azurite border, status line "accepted · board re-ranked"
- **Age-coded phrasing** — "No measurable pool effect. Legal exposure only." — `#B0AB9C` border

### Motion rules — read these carefully

**One orchestrated sequence only:** Chamber → Analysis → cut. Everything after that is *response* motion, triggered by the user, showing what changed.

- Flipping a toggle: rows FLIP-animate to new positions using framer-motion's `layout` prop with `{ type: "spring", stiffness: 350, damping: 30 }`. The nDCG readout counts to its new value.
- Selecting a candidate: evidence rules draw in left-to-right over ~200ms.
- Accepting a redline: strikethrough draws, the board re-ranks behind the panel.

**Explicitly do not build:** scroll-triggered fade-and-slide-up reveals on sections, hover lift on cards, staggered entrance animations on lists, parallax, or any ambient background motion. These are generic defaults and they will make this look machine-generated. Respect `prefers-reduced-motion` by cutting straight to end states.

### Things I do not want

- Rounded cards with soft grey shadows. Use hairline rules and negative space to separate content.
- Gradients, glows, glassmorphism, noise textures, mesh backgrounds.
- Any border-radius on the console except 12px on the outermost frame.
- Emoji, or an arrow appended to button labels.
- Tinted near-black (`#0B0B0B`, `#111`) standing in for black. Use true `#000000`.
- Placeholder lorem ipsum. Write real, specific copy.

### Copy voice

Sentence case throughout. Plain verbs, no filler. Never "successfully", "seamless", "simply", or "powerful". Empty states are invitations, not apologies. Errors say what happened and what to do.

### Mock data shape

```js
const candidates = [
  { rank: 1, name: "Priya N.", score: 91, keywordRank: 2,  hiddenGem: false },
  { rank: 2, name: "Arjun M.", score: 84, keywordRank: 15, hiddenGem: true },
  { rank: 3, name: "Sana K.",  score: 78, keywordRank: 4,  hiddenGem: false },
  { rank: 4, name: "Dev R.",   score: 71, keywordRank: 3,  hiddenGem: false },
  { rank: 5, name: "Neha T.",  score: 64, keywordRank: 9,  hiddenGem: false },
  { rank: 6, name: "Kabir S.", score: 52, keywordRank: 6,  hiddenGem: false },
  { rank: 7, name: "Ira B.",   score: 41, keywordRank: 11, hiddenGem: false }
];

const evidence = [
  {
    reqId: "R04",
    title: "Node.js backend",
    verdict: "inferred",
    quote: "Built REST APIs with Express and MongoDB for a booking platform",
    line: 42,
    score: 0.81,
    note: "Node.js never stated. Express implies it. Capped at 0.65 credit."
  },
  {
    reqId: "R07",
    title: "React",
    verdict: "confirmed",
    quote: "Shipped a React dashboard used by 400 students",
    line: 18,
    score: 0.93,
    note: null
  }
];

const requirementStates = [
  "confirmed","confirmed","inferred","inferred",
  "confirmed","missing","confirmed","missing",
  "inferred","confirmed","missing","confirmed"
];
```

### Deliverable

A single-page React app with a state machine over the five screens and a dev control to jump between them. Keyboard-navigable with visible focus rings. Responsive down to 390px — the console stacks to a single column on mobile, because judges will scan a QR code and open this on their phones.

## END OF PROMPT — copy to here

---

## How to use this

**Where to send it.** v0 and Lovable both handle this well. v0 tends to respect typographic instruction more closely; Lovable gets you a deployed URL faster. If you are working in Cursor against an existing repo, paste it as a task and point it at your component directory.

**Send it in two passes, not one.** First pass: the prompt above, minus the Redline screen. Get the Chamber, Analysis, cut, and Console right. Second pass: add the Redline. Generators degrade when asked for five screens at once, and the Console is the screen that carries 55% of your rubric — it deserves the model's full attention.

**What to fix by hand afterward.** Generators reliably drift on three things here:

1. They soften `#000000` to `#0A0A0A` or `#111`. Search and replace it back to true black — the difference is visible next to bone and it is the whole Alche reference.
2. They add `rounded-lg` and `shadow-sm` to everything. Strip both from the console.
3. They crossfade the cut instead of hard-cutting. Check the transition and force it.

**The one thing not to delegate.** Write the Chamber statement copy yourself. It is eight words on a black screen, it is the first thing a judge reads, and no generator will write it better than you will.
