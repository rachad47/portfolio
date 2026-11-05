# rachad.dev

Personal portfolio. Plain HTML, CSS and JavaScript: no framework, no npm install.

## Layout

```
index.html              homepage
BilliardBot.html …      project write-ups (BilliardBot, CoilGun, LightBoard, Xylophone)
touching-grass.html     travel journal
partials/               shared blocks: nav.html, footer.html
build.js                copies the partials into every page (see below)

css/
  tokens.css            every colour, glass material and radius (light, dark, journal)
  base.css              element defaults, page shell, dividers, utilities — every page
  nav.css               navigation ribbon — every page
  footer.css            shared footer — homepage + project pages
  glass.css             liquid-glass material (wg-surface widgets) — homepage + project pages
  home.css              homepage sections
  projects.css          homepage "More from the workbench": tabs + each project entry
  project-page.css      project write-up pages
  journal.css           travel journal
  vendor/bootstrap.min.css   Bootstrap 4 grid/navbar, trimmed to what the site uses

js/
  theme.js              colour-mode toggle
  nav.js                mobile menu, hide-on-scroll ribbon, smooth in-page links
  tabs.js               homepage project tabs
  widget-glass.js, navbar-glass.js   liquid-glass refraction filter (Chromium only, homepage)
  project-audio.js      hover sounds on the homepage project cards
  orbit-contained-lab.js            zoomable testbed figure (satellite project)
  natural-selected-journal.js, journal-photo-zoom.js, route-map-sizing.js   journal
```

Each page loads `vendor/bootstrap.min.css`, `tokens.css`, `base.css`, `nav.css`
and then only the files for that page (`footer.css` where the footer is used).

## Conventions

- **Cascade layers**: Bootstrap and `base.css` sit in `@layer vendor, base`. Every other
  file is unlayered, so it beats base by position alone. To change something base does,
  write a plain rule in the component or page file; never raise specificity to win.
- **Theme**: `<html data-theme="dark|light">`. Prefer one rule that uses a token whose
  value differs per theme (`color: var(--caption-text)`) over a light rule plus a
  `[data-theme="dark"]` override.
- **Page scope**: each `<body>` has one class: `page-home`, `page-project` or `page-journal`.
  Shared rules in `base.css` are written once for every page; a page that differs overrides
  them in its own file. `base.css` uses a page class only for the few rules that two of the
  three page types share. Page files never need one.
- **Variants are classes**: style a special case with a modifier class in the HTML
  (`sim-card--flanked`, `nj-trip--route-map`, `tp-group--sims`), not by element ID, image file
  name (`[src*=…]`), `:has()` detection or `:last-child`. Put the variant's rules in their
  own subsection after the component they modify. Selectors never use element IDs; IDs in the
  HTML are link targets only.
- **Glass widgets**: add `wg-surface` (plus `wg-button` / `wg-primary` for buttons) in the HTML.
  The component's CSS sets layout only; background, border, shadow and blur come from `glass.css`.
- **`!important`**: only for `u-*` utilities, accessibility media blocks and universal
  kill switches. Anywhere else it is a sign of a specificity fight; fix the cause.
- **Colours**: use a token from `tokens.css` (`var(--page-text)`, `var(--glass-tint)`, …)
  rather than a new hex value.
- **Utilities**: `u-center`, `u-left`, `u-w-100`, `u-maxh-400`, … (in `project-page.css`)
  replace one-off inline styles in the write-ups.
- **Framed images** in write-ups: `<span class="project-image-spacing"><img class="framed project-image-rounded" …></span>`
  (add `w-80` etc. on the span for a narrower frame).

## Shared navigation and footer

Edit `partials/nav.html` or `partials/footer.html`, then run:

```
node build.js           # updates every page
node build.js --check   # fails if a page is out of date
```

Pages mark the shared blocks with `<!-- include: partials/nav.html … -->` … `<!-- /include -->`.
The generated HTML is committed, so the pages work as-is and hosting needs no build step.

## Adding a project to the homepage tabs

In `index.html`, inside `#project`:

1. add a `<button class="tp-tab" id="tp-tab-N" role="tab" aria-controls="tp-panel-N" aria-selected="false" tabindex="-1">` to `.tp-tabs`;
2. add a `<div class="tp-group" id="tp-panel-N" role="tabpanel" aria-labelledby="tp-tab-N" hidden inert>` to `.tp-panels`
   containing your `<div class="tp-entry">…</div>`.

`tabs.js` picks it up automatically; no positions to update.

## Checking that a change looks the same

Development only (the site itself still needs no install). Once: `npm install && npx playwright install chromium`.

```
npm run shots -- baseline     # capture the last commit (or: baseline <git-ref>)
npm run shots                 # capture your working tree and compare
```

Every page is captured at 1440, 1100, 700 and 390px wide (light and dark at 1440 and 390), plus each homepage
project tab, and every element's computed styles are compared, including the hidden tabs.
Differences go to `.test-output/diff/` (images) and `.test-output/diff/styles.txt`.
A refactor is safe when this reports `all … captures identical`.

## Media

See `assets/README.md` for naming and the preview-generation tools in `tools/`.
