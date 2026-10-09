# MHGU Talisman Odds

Enter a talisman from **Monster Hunter Generations Ultimate** and see the exact odds of rolling it: from each
charm a quest gives, from melded charms, and per run of a charm-farming quest, with how each number is built.

Live: https://armoredraven17.github.io/mhgu-talisman-odds/

For example, Tenderizer +6 / Expert +10 with three slots is 1 in 68.6 million Enduring Charms from quests,
1 in 34.3 million melded Enduring Charms (a melded charm never rolls a negative second skill), and 1 in 3.6
million runs of URGENT: COAL MINERS NEEDED through its sub-quest.

## Where the numbers come from

The charm tables, the Melding Pot and the quest reward tables were read from the game's own data, and the code
that rolls them from the game's executable (a personally-owned copy). The calculation on the page was checked
against that code, run step by step under emulation, so the odds are exact rather than estimated from
simulated rolls.

## How it fits the family

Static site served from `docs/`, no build step, deployed to GitHub Pages on push to `master` by
[.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml). It shares the look of the sibling
MHGU apps (the MHFU font and the menu textures), themed after Brachydios as in Charm Farm, and links to them
from the 🔗 button.

`docs/talisman-data.js` is generated from the game data by tooling kept outside this repository; regenerate it
rather than editing it by hand. `docs/talisman-engine.js` holds all the odds calculations.

See [NOTICE.md](NOTICE.md) for attributions. Code is MIT-licensed ([LICENSE](LICENSE)).
