const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');

async function main() {
  const page = path.join(root, 'touching-grass.html');
  let html = fs.readFileSync(page, 'utf8');
  const buttons = /<button\b[^>]*class="[^"]*\b(?:nj-photo|field-poster-open)\b[^"]*"[^>]*>[\s\S]*?<\/button>/g;
  const sources = new Map();
  for (const match of html.matchAll(buttons)) {
    const source = match[0].match(/\bdata-full="([^"]+)"/);
    if (source) sources.set(source[1], match[0].includes('field-poster-open'));
  }
  const previews = new Map();
  for (const [source, poster] of sources) {
    const url = source.replace(/\.[^/.]+$/, '_preview.webp');
    const input = path.join(root, decodeURIComponent(source.replace(/&amp;/g, '&')));
    const output = path.join(root, decodeURIComponent(url.replace(/&amp;/g, '&')));
    const data = await sharp(input).rotate()
      .resize({ width: 1200, height: poster ? 1200 : 600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 }).toBuffer();
    fs.writeFileSync(output, data);
    const version = crypto.createHash('sha256').update(data).digest('hex').slice(0, 10);
    previews.set(source, url + '?v=' + version);
  }
  html = html.replace(buttons, button => {
    const source = button.match(/\bdata-full="([^"]+)"/);
    if (!source) return button;
    return button.replace(/<img\b[^>]*>/, image => image.replace(/\bsrc="[^"]+"/, 'src="' + previews.get(source[1]) + '"'));
  });
  fs.writeFileSync(page, html.split('\n').map(line => line.trimEnd()).join('\n'));
  console.log('Updated ' + previews.size + ' gallery previews beside their originals.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
