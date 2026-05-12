// Bulk color recolor — sage green palette → baby blue palette
// Run: node scripts/recolor.js
const fs = require('fs');
const path = require('path');

const map = {
  '#5a7a3a': '#3a7ab8',
  '#94c068': '#5a9de0',
  '#b8d990': '#8fb8e8',
  '#d4e8b0': '#b8d3f5',
  '#e8f3d0': '#d6e6ff',
  '#2d3a22': '#2a3a55',
  '#1a2310': '#1a2a3f',
  '#6b7560': '#6a7c95',
  '#e8e3d0': '#d6e6ff',
  '#fdfaf0': '#f0f6ff',
  '#f5ead4': '#eaf2ff',
  '#a87a50': '#5a9de0',
};

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const s = fs.statSync(p);
    if (s.isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      out.push(...walk(p));
    } else if (/\.(tsx?|css)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

const root = path.resolve(__dirname, '..', 'src');
let count = 0;
for (const f of walk(root)) {
  let c = fs.readFileSync(f, 'utf8');
  const orig = c;
  for (const [k, v] of Object.entries(map)) {
    c = c.split(k).join(v);
    c = c.split(k.toUpperCase()).join(v);
  }
  if (c !== orig) {
    fs.writeFileSync(f, c, 'utf8');
    console.log('updated:', path.relative(root, f));
    count++;
  }
}
console.log(`\nTotal updated: ${count}`);
