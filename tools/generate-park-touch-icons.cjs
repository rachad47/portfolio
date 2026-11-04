// Run with Node and Sharp installed, or set SHARP_MODULE to an existing installation.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.SHARP_MODULE || 'sharp');
const root = path.resolve(__dirname, '..');

async function main() {
  const page = path.join(root, 'touching-grass.html');
  let html = fs.readFileSync(page, 'utf8');
  const names = [...new Set([...html.matchAll(/src="assets\/site\/park-icons\/([^"?]+)\.svg/g)].map(match => match[1]))];
  const directory = path.join(root, 'assets/site/park-icons/touch');
  fs.mkdirSync(directory, { recursive: true });
  for (const name of names) {
    const input = path.join(root, 'assets/site/park-icons', name + '.svg');
    const metadata = await sharp(input, { density: 72 }).metadata();
    const density = Math.max(1, Math.min(2400, 72 * 384 / Math.max(metadata.width, metadata.height)));
    const data = await sharp(input, { density })
      .resize(384, 384, { fit: 'inside' })
      .webp({ quality: 90, alphaQuality: 100, effort: 6 }).toBuffer();
    fs.writeFileSync(path.join(directory, name + '.webp'), data);
    const version = crypto.createHash('sha256').update(data).digest('hex').slice(0, 10);
    const url = 'assets/site/park-icons/touch/' + name + '.webp';
    html = html.split('srcset="' + url).map((part, index) => index ? part.replace(/^(?:\?v=[^" ]*)?"/, '?v=' + version + '"') : part).join('srcset="' + url);
  }
  fs.writeFileSync(page, html);
  console.log('Updated ' + names.length + ' touch-device park icons and their cache versions.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
