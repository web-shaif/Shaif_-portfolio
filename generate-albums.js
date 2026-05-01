'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT       = __dirname;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const SKIP       = new Set(['node_modules', '.git', '.vscode']);

function extractYear(filename) {
  let m = filename.match(/^(\d{2})(\d{2})(\d{2})[\d\-_]/);
  if (m) return '20' + m[3];
  m = filename.match(/_(\d{2})_(\d{2})_(\d{2})[\d\-_.]/);
  if (m) return '20' + m[3];
  m = filename.match(/[\-_](\d{2})(\d{2})(\d{2})[\-_.]/);
  if (m) return '20' + m[3];
  return null;
}

const albums = fs.readdirSync(ROOT, { withFileTypes: true })
  .filter(d => d.isDirectory() && !SKIP.has(d.name) && !d.name.startsWith('.'))
  .map(d => {
    const folderPath = path.join(ROOT, d.name);
    const images = fs.readdirSync(folderPath)
      .filter(f => !f.startsWith('.') && IMAGE_EXTS.has(path.extname(f).toLowerCase()))
      .sort()
      .map(f => d.name + '/' + f);
    const isWedding = d.name.includes(' & ');
    const year      = images.length > 0 ? extractYear(path.basename(images[0])) : null;
    const meta      = isWedding ? ('Wedding' + (year ? ' \u00b7 ' + year : '')) : '';
    return { name: d.name, meta, images };
  })
  .filter(a => a.images.length > 0);

const outPath = path.join(ROOT, 'albums.json');
fs.writeFileSync(outPath, JSON.stringify(albums, null, 2));
console.log('albums.json written —', albums.length, 'albums,', albums.reduce((n, a) => n + a.images.length, 0), 'images');
