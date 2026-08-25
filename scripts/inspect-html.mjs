import fs from 'fs/promises';
import path from 'path';

async function listHtmlFiles() {
  const dir = path.resolve('storage', 'apps', 'c35260bc-8b7f-4d21-90fd-6021fd393fbd', 'public_html');
  const allHtml = [];

  async function walk(d, rel = '') {
    const entries = await fs.readdir(d, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(d, e.name);
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) {
        await walk(full, r);
      } else if (/\.(html|htm|php)$/i.test(e.name)) {
        const stat = await fs.stat(full);
        allHtml.push({ path: r, size: stat.size });
      }
    }
  }

  await walk(dir);
  console.log('HTML / PHP files encontrados:');
  console.table(allHtml);

  // Inspecionar o index.html na raiz
  try {
    const rootIndex = await fs.readFile(path.join(dir, 'index.html'), 'utf-8');
    console.log('\n--- Conteúdo do index.html da raiz (primeiras 20 linhas) ---');
    console.log(rootIndex.split('\n').slice(0, 20).join('\n'));
  } catch (e) {
    console.log('index.html na raiz não existe ou erro:', e.message);
  }
}

listHtmlFiles();
