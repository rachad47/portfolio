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

