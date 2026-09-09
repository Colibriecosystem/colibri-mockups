# CLAUDE.md

Guidance for AI agents working in this repository.

**This repo is where Colibri's UI mockups live.** Static HTML pages we look at and comment on before
something is built, published on GitHub Pages so a link is enough to review:
<https://colibriecosystem.github.io/colibri-mockups/>. Mockups are never added to the product repos
— a mockup exists to be opened by other people, so it needs a permanent URL, and Pages on this org's
plan publishes from a public repository only.

Nothing here is built, bundled or deployed by a pipeline. Pages serves `main` verbatim, so a page
must work by double-clicking the file.

## Rules

**Scrub before publishing.** No issue numbers, no private repo names, no source paths, no internal
ticket references. Everything here is public to anyone with the link, including the roadmap a mockup
hints at. When a mockup is derived from private work, this is the step that is forgotten.

**Vendor only what the page uses.** The first mockup needed nine strings from the Nest design
system's string table; the rest of that file is the moderation console's vocabulary — submission
ladder rungs, revocation reasons, the admin access model — so it is not vendored at all and the nine
live in the mock's own `catalog-i18n.js`. Before copying a file out of a private repo, read what
else it carries.

**Links to individual mockups live on the front page only.** `index.html` at the repo root is the
one index; a new mockup adds a row there and to the table in `README.md`. Everywhere else — other
repos, docs, issues — link the site root, so there is exactly one place to update.

**Never edit a vendored `kit/`.** It is a copy of a design system. Updating it means replacing the
files wholesale, not patching them, so anything a mockup needs on top goes in its own files beside
them.

**Self-host what a page needs.** No third-party requests: fonts and artwork sit next to the page.
A reviewer behind a blocked CDN would otherwise be judging typography that is not the intended one,
and the mockups are as much a typography review as a layout one.

**Data should be real where it can be.** The catalog mockup uses the ten real listings of the public
catalog, typos and all — a mockup that tidies its data hides the density being judged. Anything
invented is marked on screen, and a row is deliberately left with nothing so the "absent renders as
nothing, never a zero" rule is visible rather than described.

## Adding a mockup

Create a folder, keep it self-contained, add a row to `index.html` and to the table in `README.md`.
Both languages if the product is bilingual; a dark and a light theme; and a mock bar for whatever
the reviewer needs to toggle — it is chrome for the review, not part of the design.

Check before pushing: no horizontal scroll at the widths under review, no missing string keys, and
no internal references left in the page text or the source comments.
