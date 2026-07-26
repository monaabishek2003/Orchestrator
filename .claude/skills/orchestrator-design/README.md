# Orchestrator Design System

A dark, agentic-AI design system for **Orchestrator** — a real-time monitoring
dashboard for AI agents. The product surfaces the health of running agents,
flags ones that need attention, and lets operators triage and resolve issues
at a glance.

This system reinterprets the original light-theme dashboard as a
mission-control / observability surface: inky near-black panels, hairline
borders, monospace for agent identifiers and runtime data, and an electric
"alive" green as the single accent.

> **Source material:** a single light-theme PNG screenshot (`uploads/orchestrator ux.png`)
> showing the Orchestrator dashboard. No codebase, Figma, brand guide, or
> additional decks were provided — every value below is inferred from that
> screenshot plus the explicit brief ("dark agentic AI theme ui"). See
> *Caveats* at the end of this file.

---

## Product context

Orchestrator is an **operations console for AI agents**. The single screen
we have shows:

- **Page header** — product name + one-line description
  ("Monitor your AI agents in real time").
- **Stat row** — four key metrics (`Total Agents`, `Running`,
  `Needs Attention`, `Completed`), each with an icon, label and big number.
- **"Needs Attention" panel** — a highlighted block listing agents in error or
  stalled states, each with a one-line reason and a `Resolve` action.
- **Agents table** — full list, columns `Name | Status | Last message | Last update`.

Inferred audience: **engineers, MLOps, agent-platform operators**. The tone
is technical and direct — they want signal, not marketing.

---

## Index

Files at the project root:

| File / folder              | What's in it                                                       |
| -------------------------- | ------------------------------------------------------------------ |
| `README.md`                | This file — context, content + visual foundations, iconography.    |
| `SKILL.md`                 | Skill frontmatter for invoking this system in another project.     |
| `colors_and_type.css`      | All CSS variables: surfaces, fg, borders, accent, semantic statuses, type scale, spacing, radii, shadows, motion. |
| `fonts/`                   | Geist + Geist Mono (currently *placeholder* — see Caveats).         |
| `assets/`                  | Logo SVG + status/agent iconography (Lucide subset).               |
| `preview/`                 | Cards that render in the **Design System** tab.                    |
| `ui_kits/orchestrator/`    | Hi-fi React recreation of the Orchestrator dashboard.              |

---

## CONTENT FUNDAMENTALS

The original screenshot gives us a small but consistent voice. The system
extends it for a dark, technical UI.

### Tone & voice
- **Direct and technical.** No marketing fluff. "Monitor your AI agents in real
  time" — a sentence, not a slogan.
- **Operator-to-operator.** The product talks like a competent ops tool talks
  to an experienced engineer.
- **Status-first.** Every row, every card, every alert leads with state
  (Running / Done / Needs Attention) before context.

### Person
- **Second person, sparingly.** "Monitor *your* agents" is acceptable for
  product framing, but inside the app surface prefer **noun-led labels**:
  "Total Agents", not "Your agents". "Last update", not "When you last saw it".
- **No "I"** anywhere. The system never speaks as itself.

### Casing
- **Sentence case for everything human-readable** — labels, headings, buttons.
  ✅ `Needs Attention`, `Total Agents`, `Resolve`
  ❌ `NEEDS ATTENTION`, `Resolve Agent`
- **Uppercase + letterspacing** is reserved for tiny eyebrow labels in this
  system (e.g. section dividers in the design system, `STATUS` column header
  optionally).
- **Agent names, IDs, log lines: keep verbatim, monospace.**
  `resolve-test`, `socket-test-agent`, `Step 5: processing batch 5`.

### Specific copy patterns
- **Error / stall reasons are terse fragments.** No period.
  `No update for 12823.427s` · `Rate limit hit` · `something went wrong`
- **"Last message"** is whatever the agent emitted, rendered as-is.
- **Stat labels are 1–2 words.** `Total Agents`, `Running`, `Needs Attention`,
  `Completed`.
- **Section headings include a count in parentheses** when the section is a
  list: `Needs Attention (8)`.

### Numbers & time
- **Long durations** stay precise in raw form (`12823.427s`) — operators need
  exact numbers.
- **Last update** is humanized (`about 4 hours ago`, `14 days ago`) — at a
  glance you want age, not a timestamp.

### Emoji
- **No emoji.** This is an engineering tool. Status is communicated through
  color, glyph and shape, not faces.

### Vibe
Mission control. Calm by default, loud only where the data demands it.
The interface shouldn't talk much; the data does the talking.

---

## VISUAL FOUNDATIONS

### Colors

A five-stop dark surface scale plus a single agentic-green accent. Statuses
use **hue, not chrome** — small dot + dim background pill, never a heavy
filled badge.

| Token            | Hex / rgba                          | Use                                   |
| ---------------- | ----------------------------------- | ------------------------------------- |
| `--bg-0`         | `#08090A`                           | Page background.                      |
| `--bg-1`         | `#0D0E10`                           | Default panel.                        |
| `--bg-2`         | `#131518`                           | Raised card / table row alt.          |
| `--bg-3`         | `#1A1D21`                           | Hovered / pressed surface.            |
| `--bg-4`         | `#22262B`                           | Popovers, menus, tooltips.            |
| `--fg-1`         | `#ECEDEE`                           | Primary text.                         |
| `--fg-2`         | `#A8ABB0`                           | Secondary text.                       |
| `--fg-3`         | `#6C6F75`                           | Tertiary labels, captions.            |
| `--fg-4`         | `#44464A`                           | Disabled / quietest.                  |
| `--border-1/2/3` | `rgba(255,255,255, .06 / .09 / .14)`| Hairline / default / emphasized.      |
| `--accent`       | `#5BE49B`                           | Agentic green. Primary actions, focus, "alive". |
| `--running`      | `#5BE49B`                           | Status: agent currently running.      |
| `--warning`      | `#F5B544`                           | Status: needs attention.              |
| `--danger`       | `#FF6B6B`                           | Status: errored / fatal.              |
| `--done`         | `#6C6F75`                           | Status: completed (neutral).          |
| `--info`         | `#6BAEFF`                           | Status: informational.                |

**Hue choices, and why:**
- *Running* and *primary accent* share a hue intentionally — the green is the
  product's "the system is alive" signal. Reusing it on CTAs ties action to
  liveness.
- *Completed* is **neutral grey**, not green. A finished agent is no longer
  live; making it green would dilute the running signal.

### Type

- **Sans:** Geist (400 / 500 / 600). Default UI typeface.
- **Mono:** Geist Mono (400 / 500). Agent names, IDs, log lines, durations,
  any code-shaped data.

Scale lives in `colors_and_type.css` as `--t-*-size/-line/-weight/-tracking`:

| Token        | Px / line / weight    | Use                                  |
| ------------ | --------------------- | ------------------------------------ |
| `display`    | 44 / 1.05 / 600       | Marquee numbers, splash titles.      |
| `h1`         | 28 / 1.15 / 600       | Page title (`Orchestrator`).         |
| `h2`         | 20 / 1.25 / 600       | Section heading (`Needs Attention`). |
| `h3`         | 15 / 1.3  / 600       | Card title, table header group.      |
| `body`       | 14 / 1.5  / 400       | Default UI text.                     |
| `small`      | 13 / 1.45 / 400       | Secondary metadata.                  |
| `micro`      | 11 / 1.3  / 500 +0.06em uppercase | Eyebrows / column headers.   |
| `mono`       | 13 / 1.5  / 400       | All identifier / data cells.         |

Tracking is negative on display/h1/h2 (-0.01 to -0.02em) to keep things tight
at large sizes; mono is left alone.

### Spacing

A strict **4px grid**: `--space-1` through `--space-16`. Card padding is
`var(--space-5)` (20px); the page gutter is `var(--space-8)` (32px); table
row vertical padding is `var(--space-3)` (12px). Never combine non-grid
values.

### Radii

- `--radius-1` (4px) — pills inside dense data.
- `--radius-2` (6px) — small controls, status pills.
- `--radius-3` (8px) — buttons, inputs (default).
- `--radius-4` (12px) — cards, panels (default).
- `--radius-5` (16px) — large surfaces / overlays.
- `--radius-pill` — fully round.

### Shadows & elevation

Dark UIs barely need shadows — **borders carry most elevation**. The system
ships three shadow tokens:

- `--shadow-1` — buttons / pills (1px subtle).
- `--shadow-2` — raised cards / popovers (8px soft).
- `--shadow-pop` — menus, modals.
- `--shadow-focus` — 3px ring at `accent / 22%`.
- `--shadow-glow` — accent glow on key actions / live indicators only.

Every shadow has a 1px inset highlight at `rgba(255,255,255,0.03–0.05)` to
give surfaces a subtle "lit from above" feel without crossing into glossy.

### Borders & dividers

- All borders are `rgba(255,255,255, α)` so they sit on any surface.
- **1px hairlines** (`--border-1`) divide table rows and the "Needs Attention"
  list items.
- **1px default** (`--border-2`) outlines every card.
- **1px emphasized** (`--border-3`) on hover, or to mark the currently-focused
  row.

### Backgrounds & texture

- **Flat solid surfaces.** No photographic backgrounds, no full-bleed imagery.
  This is a control surface, not a marketing page.
- **One optional texture:** a *very* faint dot grid (8px, `rgba(255,255,255,0.025)`)
  on the page background only — gives a sense of canvas without being noisy.
  Off by default in components.
- **No gradients on surfaces.** The *one* allowed gradient is a soft
  `accent-glow` radial behind the live-agent indicator, used sparingly.
- **No glassmorphism** beyond the popover's `backdrop-filter: blur(12px)` over
  `--bg-4` at 80% opacity.

### Hover / press / focus

- **Hover** raises the surface by adding a translucent white overlay
  (`--hover`, 3.5% white) — never by changing the underlying color.
- **Press** uses `--press` (7% white) — same mechanism, more.
- **Focus** is a 3px ring at `accent / 22%` (`--shadow-focus`) — always
  visible, never hidden for "design" reasons.
- **Buttons** never shrink on press. Subtle is right.

### Motion

- **Durations:** `--dur-1` 120ms, `--dur-2` 180ms, `--dur-3` 260ms.
- **Easings:** `--ease-out` for entrances, `--ease-in-out` for state swaps.
- **What animates:** hover overlay, focus ring, status-pill color, panel
  open/close (fade + 4px translate).
- **What never animates:** numbers in stat cards (jumpy), table sort
  (just re-renders), page transitions.
- **Live signal:** a single 1.6s `pulse` on running-status dots (opacity
  60% → 100%). This is the only "ambient" animation in the system.

### Cards & panels

- **Default card:** `--bg-1` fill, `1px solid --border-2`, `--radius-4`,
  padded `var(--space-5)`, no shadow.
- **Raised card** (e.g. popover): `--bg-2`, `--shadow-2`.
- **Alert panel** ("Needs Attention"): same as default card but tinted with
  `--warning-dim` and bordered with `rgba(245,181,68, 0.25)`. Header gets
  a `--warning` icon + label, no exclamation marks in copy.
- **List rows inside an alert panel** are individually pill-cards on `--bg-1`
  with `1px solid --border-2`, sitting on the tinted panel.

### Tables

- **No vertical lines.** Horizontal hairlines (`--border-1`) only.
- **Column headers:** `micro` eyebrow style, left-aligned by default,
  right-aligned for numbers and time.
- **Row hover:** `--hover` overlay.
- **Row padding:** `12px` vertical, `16px` horizontal.
- **First column is the agent name** — always mono.

### Layout rules

- Page max-width `1240px`, gutters `32px`.
- Stat row is a 4-col grid with `--space-4` gap.
- Everything sits on the 4px grid.
- Nothing is fixed/sticky in this design system at v1 except an optional
  top app bar (see UI kit).

### Use of transparency / blur

- Reserved for **popovers / menus / tooltips**: `--bg-4` at 80% with
  `backdrop-filter: blur(12px)`.
- Status pill backgrounds are translucent (`--*-dim` ~ 12–15%) so they pick
  up the parent surface.
- Never blur the main canvas.

### Imagery vibe

When imagery is needed (rare): **cool, desaturated, near-monochrome with a
single accent-green light source**. Think long-exposure server room
photography. No warm tones. No people. If unsure, omit.

---

## ICONOGRAPHY

The screenshot uses simple geometric line icons (stacked-layers, activity
waveform, triangle warning, circled check). The closest off-the-shelf match
is **[Lucide](https://lucide.dev/)** — same line weight (1.5px), same
geometric vocabulary, MIT-licensed, ubiquitous in modern dashboards.

**Decision:** the system uses **Lucide icons** (subset, copied as static SVGs
into `assets/icons/`). This is a **flagged substitution** — the original
icons may be a custom set, but we have no source code to confirm.

### Rules
- **Stroke icons only**, 1.5px stroke, `currentColor`.
- **Sizes:** 14, 16, 18, 20, 24px. Never scale arbitrary intermediate sizes.
- **Color:** match surrounding text. Inside status pills, match the pill's
  `--*-fg`. Inside accent buttons, `--accent-fg`.
- **No emoji** anywhere in the UI. None.
- **No unicode glyphs** as icons (no `→` instead of `arrow-right`). Always
  a real SVG.
- **No multicolor / duotone icons.**

### Icon inventory shipped (`assets/icons/`)
- `layers.svg` — Total Agents stat.
- `activity.svg` — Running stat.
- `alert-triangle.svg` — Needs Attention stat + panel header.
- `check-circle.svg` — Completed stat.
- `play.svg` · `pause.svg` · `square.svg` — agent controls.
- `more-horizontal.svg` — row menus.
- `chevron-down.svg` · `chevron-right.svg` — disclosure.
- `search.svg` — search inputs.
- `filter.svg` — filter button.
- `x.svg` — close.
- `loader.svg` — spinning indicator (used in `Running` pill).
- `circle-dot.svg` — generic status dot.

### Logo

`assets/logo.svg` is a procedurally drawn wordmark + mark we authored for the
system, since the source didn't include a logo. **Flagged** — replace with
the real logo if one exists.

---

## Caveats / known substitutions

The user's brief was minimal. Decisions that **need user confirmation**:

1. **Fonts.** Geist + Geist Mono chosen as the best-fit modern agentic
   typeface. Real font files are *not* shipped — the CSS `@font-face` rules
   reference paths in `fonts/` that don't yet exist, and the fallback chain
   degrades to system sans/mono. **Please drop the real `.woff2` files into
   `fonts/` or tell me to swap for a different family.**
2. **Logo.** Author-drawn from scratch. Almost certainly wrong if a real
   Orchestrator logo exists.
3. **Icon set.** Lucide chosen as the closest line-weight match. Substitute
   if the product ships its own.
4. **Color of the agentic accent.** Chose electric green `#5BE49B` to convey
   "the system is alive". Other defensible options: cyan `#5BE4E4`, amber
   `#F5B544`, magenta. Easy to swap — it's a single CSS var.
5. **No data on additional surfaces.** Settings, login, agent-detail and
   create-agent flows are *implied* but not specified; the UI kit includes
   a reasonable detail flyout as a placeholder.
