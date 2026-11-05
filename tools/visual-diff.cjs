#!/usr/bin/env node
/*
  Visual regression check: screenshot every page and compare against a baseline.

    npm run shots -- baseline [git-ref]   screenshot a commit (default HEAD) as the baseline
    npm run shots                         screenshot the working tree and diff against it

  Every root *.html page is captured full page at 1440, 1100, 700 and 390px wide
  (light and dark at 1440 and 390), plus each homepage tab. Output goes to .test-output/ (git-ignored):
    baseline/*.png   current/*.png   diff/*.png (changed pixels in red)
  Exits 1 if any screenshot differs.

  Animations are frozen (reduced motion) and third-party embeds (YouTube etc.) are
  blocked so runs are repeatable. Needs: npm install && npx playwright install chromium
*/
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { chromium } = require('playwright');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.test-output');
// In-between widths catch breakpoint ranges (575 / 767 / 991 / 1199px); colour is checked at two of them.
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, themes: ['light', 'dark'] },
  laptop: { width: 1100, height: 800, themes: ['light'] },
  tablet: { width: 700, height: 1000, themes: ['light'] },
  phone: { width: 390, height: 844, themes: ['light', 'dark'] },
};
const NOISE_PX = 10;
// Web fonts stay blocked: their load timing shifts text by sub-pixels between runs.
// Font choices are still compared through the computed font-family.
const ALLOWED_HOSTS = ['cdnjs.cloudflare.com'];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.json': 'application/json', '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf', '.ico': 'image/x-icon' };

// Computed styles compared for every element (hidden tab panels included, which
// screenshots cannot see). Values are computed, not used, so they compare cleanly.
const STYLE_PROPS = ['display', 'position', 'top', 'right', 'bottom', 'left', 'z-index', 'float', 'clear',
  'box-sizing', 'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height', 'aspect-ratio',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-top-color',
  'border-right-color', 'border-bottom-color', 'border-left-color', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius', 'outline-style', 'outline-color', 'outline-width',
  'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'order', 'justify-content', 'justify-items',
  'justify-self', 'align-content', 'align-items', 'align-self', 'row-gap', 'column-gap',
  'grid-template-columns', 'grid-template-rows', 'grid-template-areas', 'grid-auto-flow', 'grid-auto-rows', 'grid-auto-columns',
  'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
  'overflow-x', 'overflow-y', 'visibility', 'opacity', 'transform', 'translate', 'scale', 'rotate', 'filter', 'backdrop-filter', 'mix-blend-mode',
  'color', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat', 'box-shadow',
  'text-shadow', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing', 'word-spacing',
  'text-align', 'text-transform', 'text-decoration-line', 'text-decoration-color', 'text-indent', 'white-space', 'vertical-align',
  'list-style-type', 'list-style-position', 'object-fit', 'object-position', 'cursor', 'pointer-events', 'content',
  'transition-property', 'transition-duration', 'animation-name', 'mask-image', 'clip-path', 'isolation', 'inset'];

// Runs in the page: { "<element path>": { prop: value, "::before": {...}, "::after": {...} } }
function dumpStyles(props) {
  const out = {};
  const pick = (cs) => {
    const o = {};
    for (const p of props) o[p] = cs.getPropertyValue(p).replace(/url\("data:[^)]*\)/g, 'url(frozen-frame)');
    return o;
  };
  const key = (el) => {
    const parts = [];
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      if (e.id) { parts.unshift('#' + e.id); break; }
      const same = [...e.parentElement.children].filter((c) => c.tagName === e.tagName);
      parts.unshift(e.tagName.toLowerCase() + (same.length > 1 ? `[${same.indexOf(e) + 1}]` : ''));
    }
    return parts.join('>') || 'html';
  };
  for (const el of [document.documentElement, ...document.querySelectorAll('body, body *')]) {
    if (/^(SCRIPT|STYLE|LINK|META|TEMPLATE|NOSCRIPT)$/.test(el.tagName) || el.closest('svg') && el.tagName !== 'svg') continue;
    const entry = pick(getComputedStyle(el));
    for (const pseudo of ['::before', '::after', '::marker']) {
      const cs = getComputedStyle(el, pseudo);
      if (pseudo === '::marker' ? el.tagName === 'LI' : cs.content !== 'none') entry[pseudo] = pick(cs);
    }
    // The hide-on-scroll navbar's transform depends on scroll timing, not on CSS.
    if (el.matches('body > nav')) delete entry.transform;
    // The tab captures hide the navbar (see capture); its icons fade, so skip visibility there.
    if (el.closest('body > nav')) { delete entry.visibility; for (const p of ['::before', '::after']) if (entry[p]) delete entry[p].visibility; }
    out[key(el)] = entry;
  }
  return out;
}

// Runs in the page: wait (up to 3s) for running CSS transitions/animations to finish.
async function settleAnimations() {
  const running = document.getAnimations().filter((a) => a.playState === 'running' && a.effect?.getTiming().iterations !== Infinity);
  await Promise.race([Promise.all(running.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]);
}

function serve(dir) {
  const server = http.createServer((req, res) => {
    const file = path.join(dir, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(dir)) { res.writeHead(403); return res.end(); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function capture(srcDir, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  // Skip redirect stubs (e.g. beyond-engineering.html): they only show the page they point to.
  const pages = fs.readdirSync(srcDir).filter((f) => f.endsWith('.html') &&
    !/http-equiv="refresh"/i.test(fs.readFileSync(path.join(srcDir, f), 'utf8')));
  const server = await serve(srcDir);
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const combos = Object.entries(VIEWPORTS).flatMap(([vpName, { themes, ...viewport }]) => themes.map((theme) => [vpName, viewport, theme]));
  // A few viewports at a time: all at once needs several GB of memory. SHOTS_JOBS=6 for speed.
  const jobs = Math.max(1, Number(process.env.SHOTS_JOBS) || 3);
  const queue = [...combos];
  await Promise.all(Array.from({ length: jobs }, async () => {
    for (let combo; (combo = queue.shift());) {
      const [vpName, viewport, theme] = combo;
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', deviceScaleFactor: 1,
        isMobile: viewport.width < 768, hasTouch: viewport.width < 768 });
      await context.addInitScript((t) => { try { localStorage.setItem('portfolio-color-mode-v2', t); } catch (e) {} }, theme);
      await context.route('**/*', (route) => {
        const url = new URL(route.request().url());
        if (url.hostname === '127.0.0.1' || ALLOWED_HOSTS.includes(url.hostname)) return route.continue();
        return route.abort();
      });
      for (const file of pages) {
        const page = await context.newPage();
        await page.goto(base + file, { waitUntil: 'load', timeout: 60000 });
        // Scroll through once so lazy images and scroll-triggered reveals settle, then return to top.
        await page.evaluate(async () => {
          document.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; img.decoding = 'sync'; });
          for (let y = 0; y < document.documentElement.scrollHeight; y += window.innerHeight / 2) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 40));
          }
          window.scrollTo(0, 0);
          await Promise.race([
            Promise.all([...document.images].map((img) => img.complete ? 0 : new Promise((r) => { img.addEventListener('load', r); img.addEventListener('error', r); }))),
            new Promise((r) => setTimeout(r, 30000))]);
          // Freeze animated images on their first frame (src is left alone; CSS may match on it).
          await Promise.all([...document.images].filter((img) => /\.(webp|gif|png)(\?|$)/i.test(img.currentSrc || img.src)).map(async (img) => {
            try {
              const bitmap = await createImageBitmap(await (await fetch(img.currentSrc || img.src)).blob());
              const canvas = document.createElement('canvas');
              canvas.width = bitmap.width; canvas.height = bitmap.height;
              canvas.getContext('2d').drawImage(bitmap, 0, 0);
              const still = new Image();
              still.src = canvas.toDataURL();
              await still.decode();
              img.style.content = `url(${still.src})`;
            } catch (e) { /* not decodable: leave as is */ }
          }));
          document.querySelectorAll('video').forEach((v) => { v.pause(); v.currentTime = 0; });
          const settle = Promise.all([document.fonts.ready,
            ...[...document.images].map((img) => img.decode().catch(() => {}))]);
          await Promise.race([settle, new Promise((r) => setTimeout(r, 20000))]);
          // Two frames so the decoded images are actually painted.
          await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        });
        await page.waitForTimeout(1000);
        await page.evaluate(settleAnimations);
        console.log(`  ${file} ${vpName} ${theme}`);
        const name = `${file.replace('.html', '')}--${vpName}--${theme}`;
        fs.writeFileSync(path.join(outDir, `${name}.styles.json`), JSON.stringify(await page.evaluate(dumpStyles, STYLE_PROPS)));
        await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true, animations: 'disabled', caret: 'hide' });
        // Homepage project tabs: only one panel is visible at a time, so capture each.
        const tabs = await page.$$('.tp-tab');
        // The fixed navbar shows/hides with scroll direction and would drift into the panel crops.
        if (tabs.length) await page.addStyleTag({ content: 'body > nav { visibility: hidden !important; }' });
        for (let i = 1; i < tabs.length; i++) {
          await tabs[i].click();
          await page.mouse.move(0, 0);
          await page.waitForTimeout(300);
          await page.evaluate(settleAnimations);
          fs.writeFileSync(path.join(outDir, `${name}--tab${i}.styles.json`), JSON.stringify(await page.evaluate(dumpStyles, STYLE_PROPS)));
          await page.locator('#project').screenshot({ path: path.join(outDir, `${name}--tab${i}.png`), animations: 'disabled', caret: 'hide' });
        }
        await page.close();
      }
      await context.close();
    }
  }));
  await browser.close();
  server.close();
}

function compare() {
  const baseDir = path.join(OUT, 'baseline'), curDir = path.join(OUT, 'current'), diffDir = path.join(OUT, 'diff');
  fs.rmSync(diffDir, { recursive: true, force: true });
  fs.mkdirSync(diffDir, { recursive: true });
  let failed = 0;
  const names = [...new Set([...fs.readdirSync(baseDir), ...fs.readdirSync(curDir)])].sort();
  const styleReport = [];
  for (const name of names) {
    const a = path.join(baseDir, name), b = path.join(curDir, name);
    if (!fs.existsSync(a) || !fs.existsSync(b)) { console.log(`MISSING  ${name}`); failed++; continue; }
    if (name.endsWith('.styles.json')) {
      // widget-glass.js numbers its SVG filters in observer order, which varies between runs.
      const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/#widget-glass-\d+/g, '#widget-glass-N'));
      const sa = read(a), sb = read(b);
      const changes = [];
      const flat = (o, prefix = '') => Object.entries(o || {}).flatMap(([k, v]) =>
        typeof v === 'object' ? flat(v, prefix + k + ' ') : [[prefix + k, v]]);
      for (const el of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
        if (!sa[el] || !sb[el]) { changes.push(`${el}: ${sa[el] ? 'removed' : 'added'}`); continue; }
        const fa = new Map(flat(sa[el])), fb = new Map(flat(sb[el]));
        for (const p of new Set([...fa.keys(), ...fb.keys()]))
          if (fa.get(p) !== fb.get(p)) changes.push(`${el} { ${p}: ${fa.get(p)} -> ${fb.get(p)} }`);
      }
      if (changes.length) {
        console.log(`STYLES   ${name}  ${changes.length} changed values`);
        styleReport.push(`## ${name}\n${changes.join('\n')}\n`);
        failed++;
      }
      continue;
    }
    const imgA = PNG.sync.read(fs.readFileSync(a)), imgB = PNG.sync.read(fs.readFileSync(b));
    if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
      console.log(`SIZE     ${name}  ${imgA.width}x${imgA.height} -> ${imgB.width}x${imgB.height}`);
      failed++; continue;
    }
    const diff = new PNG({ width: imgA.width, height: imgA.height });
    const n = pixelmatch(imgA.data, imgB.data, diff.data, imgA.width, imgA.height, { threshold: 0.05 });
    // A handful of pixels is anti-aliasing jitter between runs; any real change touches far more.
    if (n > 0 && n <= NOISE_PX) console.log(`noise    ${name}  ${n} px (ignored)`);
    if (n > NOISE_PX) {
      fs.writeFileSync(path.join(diffDir, name), PNG.sync.write(diff));
      console.log(`DIFF     ${name}  ${n} px`);
      failed++;
    }
  }
  fs.writeFileSync(path.join(diffDir, 'styles.txt'), styleReport.join('\n'));
  console.log(failed ? `\n${failed} of ${names.length} captures differ (see .test-output/diff/, styles.txt)` : `\nall ${names.length} captures identical`);
  return failed;
}

(async () => {
  const [mode, ref = 'HEAD'] = process.argv.slice(2);
  if (mode === 'baseline') {
    const src = path.join(OUT, 'baseline-src');
    fs.rmSync(src, { recursive: true, force: true });
    fs.mkdirSync(src, { recursive: true });
    execSync(`git -C "${ROOT}" archive ${ref} | tar -x`, { cwd: src, stdio: 'inherit', shell: true });
    await capture(src, path.join(OUT, 'baseline'));
    console.log(`baseline captured from ${ref}`);
  } else {
    if (mode !== 'compare') await capture(ROOT, path.join(OUT, 'current'));
    process.exit(compare() ? 1 : 0);
  }
})().catch((e) => { console.error(e); process.exit(2); });
