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
    const image = match[0].match(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/);
    if (image) sources.set(image[1], match[0].includes('field-poster-open'));
  }
  const directory = path.join(root, 'assets/travel/touch-previews');
  fs.mkdirSync(directory, { recursive: true });
  const previews = new Map();
  let originalPixels = 0, previewPixels = 0, originalBytes = 0, previewBytes = 0;
  for (const [source, poster] of sources) {
    const input = path.join(root, decodeURIComponent(source.replace(/&amp;/g, '&')));
    const original = await sharp(input).metadata();
    const data = await sharp(input).rotate()
      .resize({ width: 1200, height: poster ? 1200 : 600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 86, effort: 4 }).toBuffer();
    const name = crypto.createHash('sha256').update(source).digest('hex').slice(0, 12) + '-' + crypto.createHash('sha256').update(data).digest('hex').slice(0, 10) + '.webp';
    const url = 'assets/travel/touch-previews/' + name;
    fs.writeFileSync(path.join(directory, name), data);
    const preview = await sharp(data).metadata();
    originalPixels += original.width * original.height;
    previewPixels += preview.width * preview.height;
    originalBytes += fs.statSync(input).size;
    previewBytes += data.length;
    previews.set(source, url);
  }
  html = html.replace(buttons, button => {
    const image = button.match(/<img\b[^>]*\bsrc="([^"]+)"[^>]*>/);
    if (!image) return button;
    const picture = '<picture class="journal-preview-source"><source media="(hover: none) and (pointer: coarse)" type="image/webp" srcset="' + previews.get(image[1]) + '">' + image[0] + '</picture>';
    if (button.includes('class="journal-preview-source"')) return button.replace(/<picture class="journal-preview-source">[\s\S]*?<\/picture>/, picture);
    return button.replace(image[0], picture);
  });
  fs.writeFileSync(page, html.split('\n').map(line => line.trimEnd()).join('\n'));
  console.log(JSON.stringify({images: sources.size, originalPixels, previewPixels, originalBytes, previewBytes}));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

