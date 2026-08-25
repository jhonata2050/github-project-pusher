import fs from 'fs';
import path from 'path';

const zipPath = path.resolve('storage', 'apps', 'c35260bc-8b7f-4d21-90fd-6021fd393fbd', 'public_html', 'eqsam-13-08-26.zip');
if (fs.existsSync(zipPath)) {
  const stat = fs.statSync(zipPath);
  console.log(`Arquivo eqsam-13-08-26.zip encontrado com tamanho: ${stat.size} bytes. Removendo versão corrompida de 0 bytes...`);
  if (stat.size === 0) {
    fs.unlinkSync(zipPath);
    console.log('Removido com sucesso.');
  }
} else {
  console.log('Arquivo eqsam-13-08-26.zip não encontrado.');
}
