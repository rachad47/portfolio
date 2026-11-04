# Website media

- `site/`: portrait, homepage banner, favicons, toolkit logos, and postcard artwork used by the site shell.
- `projects/<project>/`: media belonging to that project, even when it is also displayed on the homepage.
- `travel/<trip>/`: travel photos grouped by trip. Filenames use the trip name and a sequence number, for example `hawaii_01.webp`.

## Naming

Use lowercase, hyphen-separated descriptive names. Keep these related files together:

```text
projects/flying-probes/system-overview-preview.webp

projects/billiardbot/error-correction-demo.mp4
projects/billiardbot/error-correction-demo-poster.webp
```

The homepage uses smaller `-preview.webp` animations, while project pages use `-optimized.webp` versions where available. Unused originals are archived outside the repository. A video poster is a still image shown before playback.

## Shared media

Reference the same project file from both `index.html` and the project's own page; do not create an extra copy for the homepage. Exact byte-for-byte duplicates share one canonical file. Keep different crops or compressed variants only when they are referenced by the site.

The site pages are at the repository root, so their paths begin with `assets/`. From a stylesheet in `css/`, a media URL normally begins with `../assets/`.

If you move or rename a file later, update `src`, `poster`, `data-full`, CSS URLs/selectors, and any JavaScript references. Filenames are case-sensitive on GitHub Pages.

## Park icons on touch devices

Keep `site/park-icons/*.svg` as the artwork masters. The journal uses the matching transparent WebP files in `site/park-icons/touch/` on touch devices, avoiding repeated rendering of thousands of SVG paths during pinch zoom. Desktop keeps the original SVGs.

After editing an SVG, regenerate its touch preview using `node tools/generate-park-touch-icons.cjs` with Sharp available (or set `SHARP_MODULE` to an existing Sharp installation). The tool bounds previews to 384 pixels and updates their cache versions in the journal HTML. Do not edit the previews independently.

### Journal photo previews

Touching Grass uses smaller previews in its galleries on both desktop and mobile. Each preview lives beside its original as `originalName_preview.webp`. Gallery previews fit within 1200 × 600 pixels; the park poster fits within 1200 × 1200. Existing lazy loading and displayed dimensions stay intact. The photo viewer loads the original from `data-full` when opened; desktop hover enlargement uses the preview.

After adding or replacing journal photos, run `node tools/generate-journal-previews.cjs` with Sharp installed (or set `SHARP_MODULE` to its module path). The script derives filenames from `data-full`, regenerates previews, and updates gallery sources. A content hash in the URL query refreshes cached previews without changing their readable filenames.
