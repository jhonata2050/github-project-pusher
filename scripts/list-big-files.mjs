import fs from 'fs/promises';
import path from 'path';

async function listBigFiles() {
  const dir = path.resolve('storage', 'apps', 'c35260bc-8b7f-4d21-90fd-6021fd393fbd', 'public_html');
  const all = [];

  async function walk(d, rel = '') {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        await walk(full, r);
      } else {
        const stat = await fs.stat(full);
        all.push({ path: r, size: stat.size, mb: (stat.size / (1024 * 1024)).toFixed(2) });
      }
    }
  }

  await walk(dir);
  all.sort((a, b) => b.size - a.size);
  console.log('Top 15 maiores arquivos:');
  console.table(all.slice(0, 15));
}

listBigFiles();
