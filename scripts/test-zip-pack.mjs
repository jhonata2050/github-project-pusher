import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

async function testAddRecursive() {
  const clientRoot = path.resolve('storage', 'apps', 'c35260bc-8b7f-4d21-90fd-6021fd393fbd', 'public_html');
  console.log('clientRoot:', clientRoot);

  const zip = new JSZip();
  let count = 0;

  async function addRecursive(d, rel = '') {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await addRecursive(full, r);
      } else if (!ent.name.endsWith('.zip') && !ent.name.endsWith('.tar') && !ent.name.endsWith('.gz')) {
        const data = await fs.readFile(full);
        zip.file(r.replace(/\\/g, '/'), data);
        count++;
      }
    }
  }

  await addRecursive(clientRoot);
  console.log('Total files added to zip:', count);

  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  console.log('Generated buffer size:', buf.length, 'bytes');
}

testAddRecursive();
