import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';

async function packCleanSite() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const storageDir = path.resolve('storage', 'apps', appId, 'public_html');

  const zip = new JSZip();
  let fileCount = 0;

  async function add(d, rel = '') {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(d, ent.name);
      const r = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await add(full, r);
      } else if (!ent.name.endsWith('.zip') && !ent.name.endsWith('.tar') && !ent.name.endsWith('.gz')) {
        const data = await fs.readFile(full);
        zip.file(r, data);
        fileCount++;
      }
    }
  }

  await add(storageDir);
  const buf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  console.log(`Site limpo sem zips: ${fileCount} arquivos.`);
  console.log(`Tamanho final do ZIP do site: ${(buf.length / (1024 * 1024)).toFixed(2)} MB (${buf.length} bytes)`);
}

packCleanSite();
