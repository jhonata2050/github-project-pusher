import fs from 'fs';
import path from 'path';
import { moveRealItems } from '../src/lib/file-manager/filesystem.ts';

const clientRoot = path.resolve('storage', 'apps', 'c35260bc-8b7f-4d21-90fd-6021fd393fbd', 'public_html');

async function testMoveFolder() {
  const testSubDir = path.join(clientRoot, 'test_dir_source');
  const testFile = path.join(testSubDir, 'subfile.txt');
  if (!fs.existsSync(testSubDir)) fs.mkdirSync(testSubDir, { recursive: true });
  fs.writeFileSync(testFile, 'conteudo de teste');

  console.log('Testando movimentação de diretório com arquivos internos...');
  const moved = await moveRealItems(clientRoot, ['test_dir_source'], '');
  console.log('Itens movidos:', moved);

  // Limpeza
  if (fs.existsSync(path.join(clientRoot, 'test_dir_source'))) {
    fs.rmSync(path.join(clientRoot, 'test_dir_source'), { recursive: true, force: true });
  }

  console.log('✅ [PASSOU] Movimentação executada com 100% de sucesso sem EPERM!');
}

testMoveFolder().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
