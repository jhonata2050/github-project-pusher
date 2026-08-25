import fs from 'fs';
import path from 'path';

const storageDir = path.resolve('storage', 'apps', 'c35260bc-8b7f-4d21-90fd-6021fd393fbd', 'public_html');
['teste-vazio.txt', 'teste-com-conteudo.txt'].forEach(f => {
  const p = path.join(storageDir, f);
  if (fs.existsSync(p)) fs.unlinkSync(p);
});
console.log('Arquivos de teste temporários limpos.');
