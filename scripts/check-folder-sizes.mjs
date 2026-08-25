import fs from 'fs';
import path from 'path';

const clientRoot = path.resolve('storage', 'apps', 'c35260bc-8b7f-4d21-90fd-6021fd393fbd', 'public_html');

function getDirSize(d) {
  let total = 0;
  const entries = fs.readdirSync(d, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(d, ent.name);
    if (ent.isDirectory()) {
      total += getDirSize(full);
    } else {
      total += fs.statSync(full).size;
    }
  }
  return total;
}

const entries = fs.readdirSync(clientRoot, { withFileTypes: true });
for (const ent of entries) {
  const full = path.join(clientRoot, ent.name);
  const size = ent.isDirectory() ? getDirSize(full) : fs.statSync(full).size;
  console.log(`${(size / (1024 * 1024)).toFixed(2)} MB -> ${ent.name} ${ent.isDirectory() ? '(DIR)' : ''}`);
}
