# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A static single page: enter an MHGU talisman (two skills with points, slots, "this or better" or "exactly
this") and see the exact odds of rolling it per charm rolled, from quest charms and melded charms, plus a
panel per charm-farming quest (runs needed, charms per run).

Skill 1 can be **"Any skill"** (only while a Skill 2 is chosen; it switches off and restores the previous
Skill 1 when Skill 2 is cleared). The query then has `secondOnly: true`: the named skill must be the
SECOND skill, the first can be anything at any points. Checked: equals the "-A" order of the one-skill
query in "this or better", and matches a Monte Carlo of the ROM-verified roller in "exactly this".

Live: https://armoredraven17.github.io/mhgu-talisman-odds/ — deployed by `.github/workflows/deploy-pages.yml`
on push to `master`, the same setup as `mhgu-armor-skills-explained`.

## Files

- `docs/index.html` — markup, styles and UI script in one file (no build step, no modules)
- `docs/talisman-engine.js` — every odds calculation. Pure, no DOM; `TalismanOdds(data)` returns the API
- `docs/talisman-data.js` — **generated**, do not edit: `python C:\MHGU-Extract\charm\build_page_data.py docs\talisman-data.js`
- The decode itself, the Python models and the checks that run the game's own code under emulation live in
  `C:\MHGU-Extract\charm\` (`charm-roll.md` is the write-up). The engine was compared with them before
  publishing; rerun `C:\MHGU-Extract\charm\page\test.cjs` / `test2.cjs` after changing the engine.

## Cache busting

Bump `?v=N` on `talisman-data.js` / `talisman-engine.js` in `docs/index.html` whenever that file changes.

## Rules for the page (Raven's)

- Keep it about the charm rolls, not how to handle charm farming: no advice on best inputs, quest pacing, or how
  melding speed compares with farming. Facts about how or WHEN a roll happens belong (a melded talisman is
  rolled the moment the order is placed).
- The general area shows odds **per charm rolled** only, never per order. Everything Melding-specific stays in
  the Melding Pot panel, including the Halcyon/Juju talisman pickers.
- Plain language, one figure per route ("1 in 68.6 million charms"); no "50% after" stats, no point totals.
  Readers are MHGU players: don't explain the basics (the charm farm, sub-quests).
- Theme: Brachydios, as in Charm Farm (surfaces derived from `#0B2757` with Charm Farm's formulas), highlights
  in the slime green on his icon, `#9cd752`.

## Conventions

- All text goes into the DOM through `textContent` (the `h()` helper), never `innerHTML`.
- Elements with an id are looked up once and kept (`$`). The Melding Pot pickers move into the card on every
  render, and `getElementById` can't find them while the old card is detached.
- Storage key `mhgu-talisman-odds-query` — every MHGU app shares one origin, so keys stay prefixed.
- Test locally with the `mhgu-talisman-odds` entry (port 5598) in `mh3u-quest-randomizer/.claude/launch.json`.
