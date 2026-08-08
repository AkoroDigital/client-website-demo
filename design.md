# Design System — Business Name (Water Restoration)

## Brand & thesis

**Thesis:** When water hits, we show up fast — and make it right.

Business Name is a local water damage restoration company. The site exists to
turn a person in a bad moment — a flooded basement, a burst pipe, a soaked
carpet — into a phone call. Everything on the page should read as *capable
and fast*, not polished-for-polish's-sake. Professionalism here doesn't look
like a law firm; it looks like a crew that has clearly done this a hundred
times and isn't rattled.

Placeholder note: "Business Name" stands in until the real name is set.
Logo and photography are not yet available — see Assets plan.

## Audience & the one job

The visitor is usually mid-emergency: water is actively damaging their home
right now, or was discovered within the last day. They are stressed, want
reassurance fast, and are comparing 2–3 companies in the same ten minutes.

The one job of this site: **get them to call.** Getting a quote is the
acceptable fallback for a less urgent visitor (e.g. researching ahead of a
renovation, or a lower-stakes drip). Every other goal the client mentioned —
lead gen, SEO, information — is served *through* that primary action, not
alongside it as an equal option.

## Palette (OKLCH, named roles)

One saturated accent only. Every neutral is tinted toward the storm-navy hue
(250) — nothing is pure black or pure white.

| Role | Value | Use |
|---|---|---|
| `--bg` | `oklch(18% 0.03 250)` | Page background |
| `--surface` | `oklch(23% 0.035 250)` | Cards, panels, raised blocks |
| `--surface-raised` | `oklch(27% 0.035 250)` | Hover / active surface state |
| `--ink` | `oklch(94% 0.01 250)` | Primary text |
| `--ink-muted` | `oklch(70% 0.02 250)` | Secondary text, captions |
| `--line` | `oklch(30% 0.03 250)` | Borders, dividers |
| `--accent` | `oklch(75% 0.16 70)` | CTAs, links, the one warning-amber highlight |
| `--accent-ink` | `oklch(20% 0.03 70)` | Text placed on top of `--accent` |

**Do:** use accent only for the primary call-to-action and small emergency
markers (phone icon, "24/7" badge). **Don't** tint large surfaces in accent,
don't introduce a second accent hue, don't use pure `#000`/`#fff` anywhere.

## Type (display / body / utility)

- **Display — Archivo Black.** Uppercase, tight tracking (-0.01em). Hero
  headline, section headers, the phone-number CTA. Used sparingly — it's
  loud by design, so one or two per screen, never body copy.
- **Body — Source Sans 3.** Weights 400/600. All paragraph copy, nav labels,
  form fields.
- **Utility — JetBrains Mono.** Phone numbers, hours, badges, form
  micro-labels, timestamps ("Response in 60 min"). Gives the page a
  dispatch-log, technical-readout feel that reinforces reliability.

**Scale** (base 16px, 1.25 ratio-ish, hand-tuned for headline punch):

| Token | Size | Weight | Use |
|---|---|---|---|
| `--text-hero` | 2.75rem / 3.5rem desktop | 900 (Archivo) | Hero headline |
| `--text-h2` | 1.75rem / 2.25rem desktop | 900 (Archivo) | Section headers |
| `--text-lead` | 1.125rem | 400 (Source Sans) | Lede / intro paragraphs |
| `--text-body` | 1rem | 400 (Source Sans) | Body copy |
| `--text-small` | 0.875rem | 400 (Source Sans) | Captions, fine print |
| `--text-mono` | 0.85rem | 500 (JetBrains Mono) | Labels, phone, badges |

**Do:** let Archivo Black headlines break onto 2 lines max, keep line length
for body copy under ~65ch. **Don't** set body paragraphs in Archivo Black,
don't use more than one display size per screen, don't italicize the mono face.

## Layout & spacing

8px base unit. Spacing scale: 8 / 16 / 24 / 32 / 48 / 64 / 96px.

Mobile-first, single column up to 640px; content max-width 1200px on desktop
with generous side margins (min 24px mobile, 64px+ desktop). Sections get
room to breathe — prefer fewer sections with more vertical padding (64–96px)
over many cramped ones. The hero is the loudest moment on the page; every
section after it should feel calmer, not louder.

## Signature element

**The notch.** Every primary CTA button and card has one corner (top-right)
clipped at 10px with a `clip-path`, echoing the cut corners on equipment
casing and hazard signage — without resorting to literal yellow/black
hazard-stripe cliché. It's the one recurring geometric signature tying
buttons, cards, and the phone-number badge together. Used consistently, never
on body text containers or the header itself.

## Motion

**Structural:** on load, hero headline and CTA fade/rise in once (200ms
stagger, 16px translate, ease-out). Section content fades in on scroll,
once per element, no re-triggering.

**Polish:** buttons and cards lift 2px with a soft shadow on hover/focus;
the notch corner sharpens slightly on hover (clip-path size shrinks) as a
small tactile cue. Transitions 150–200ms, ease-out.

**Restraint rule:** motion only ever signals state (loaded, hovered,
focused, in-view) — it never plays for decoration, never loops, never
autoplays. All animation respects `prefers-reduced-motion: reduce` by
dropping to instant/no transition.

## Components

- **Sticky header:** brand name (Archivo Black) left, phone number in mono
  right, always visible, background `--surface` on scroll.
- **Primary button:** `--accent` fill, `--accent-ink` text, notch corner,
  used for "Call Now" / phone actions.
- **Secondary button:** outline in `--line`, `--ink` text, no notch fill —
  used for "Get a Quote."
- **Card:** `--surface` background, `--line` 1px border, notch corner,
  used for services, process steps, trust badges.
- **Badge:** mono text, small pill, `--accent` border with transparent fill
  — "24/7 Response", "Licensed & Insured."
- **Form:** minimal fields (name, phone, address, what happened), `--surface`
  inputs, accent focus ring, single-column, one submit action.
- **Footer:** placeholder location/hours in mono, secondary contact info,
  quiet — no accent color here.

## Copy rules

- Lead with the action, not the company: "Call now" beats "We are pleased
  to offer."
- Short sentences. Active voice. No adjectives doing the work facts should
  do ("fast" is proven by "60-minute response," not by saying "fast" twice).
- Say "we," not "our team" or "our company."
- One idea per sentence. No stacked clauses.
- No exclamation points. Urgency comes from clarity, not punctuation.
- Numbers and specifics (response time, years, licenses) always render in
  the mono utility face to read as verified data, not marketing claim.

## Assets plan

No logo or photography supplied yet; site currently ships with zero images
by design (see index.html — type only). When photography is available:

| Slot | Look | Source |
|---|---|---|
| Hero background/side image | A technician arriving on-site with gear, low warm light against the cool navy UI — motion-blurred or slightly candid, not staged-smiling stock | Client-supplied photo shoot; placeholder to skip until real photo exists |
| Process section (3 images) | Equipment mid-job: extraction, drying fans in a hallway, moisture meter reading | Client-supplied; if unavailable, replace with a simple mono-line icon set instead of stock photos |
| Trust section | Licensing/certification badges, insurance logos | Client-supplied vector logos, rendered small and quiet, not blown up |
| Logo | Once received, drop into header at natural size; do not recolor to force-fit accent amber unless it already reads well against `--bg` | Client-supplied |

Rule: never fill an empty image slot with generic stock photography of
smiling actors in hard hats. If a real photo isn't available, use type,
icons, or leave the space quiet — emptiness reads more premium than a fake.

## Conversion essentials

- Phone number visible in the header on every screen, in mono, tap-to-call
  on mobile.
- Primary CTA ("Call Now") above the fold, accent-colored, first thing after
  the headline.
- Secondary CTA ("Get a Quote") always present but visually quieter.
- Trust signals (licensed/insured, response-time claim) within the first
  screen, not buried lower on the page.
- Quote form kept to the minimum fields needed to call the person back.
- Placeholder location/hours/phone are clearly labeled as placeholders in
  code comments so they're easy to find and swap later.

## Anti-patterns

- Cream background + serif display + terracotta accent.
- Near-black background + single acid-green/neon accent.
- Broadsheet hairline rules and newspaper-style dividers.
- Literal yellow-and-black hazard stripes (too on-the-nose for a restoration
  brand — the notch motif carries that idea instead).
- Stock photography of actors in branded polos smiling at a clipboard.
- Gradient text, glassmorphism, drop shadows stacked for depth theater.
- More than one saturated accent color on screen at once.
- Walls of marketing copy above the fold instead of the phone number.

## References

None supplied by the client (no logo, no reference sites). This direction
was derived from the thesis line and sector conventions — emergency vehicle
signage, industrial equipment labeling, and dispatch/status-readout
typography — rather than from competitor restoration sites, to avoid the
category's generic "orange splash + stock photo" look.
