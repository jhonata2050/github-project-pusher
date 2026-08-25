import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function checkZipSize() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const storageDir = path.resolve('storage', 'apps', appId, 'public_html');

  const zip = new JSZip();

  async function addDir(dir, rel = '') {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      const entryRel = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        await addDir(full, entryRel);
      } else {
        const data = await fs.readFile(full);
        zip.file(entryRel, data);
      }
    }
  }

  await addDir(storageDir);
  const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } });
  console.log(`Tamanho do ZIP compactado de TODOS os 193 arquivos: ${zipBuf.length} bytes (${(zipBuf.length / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`Base64 do ZIP: ${zipBuf.toString('base64').length} caracteres`);
}

checkZipSize();
