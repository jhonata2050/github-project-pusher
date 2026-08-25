import fs from 'fs';
import { uploadAppFilesBatch } from '../src/lib/file-manager/server.ts';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const envText = fs.readFileSync('.env', 'utf8');
envText.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

async function testUploadEmptyFile() {
  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const userId = 'a996f90b-b397-4dcf-b97e-265a335852d3';

  console.log('Testando upload com arquivo vazio de 0 bytes (.gitkeep)...');
  const res = await uploadAppFilesBatch(
    appId,
    '',
    [
      { name: 'teste-vazio.txt', contentBase64: '' },
      { name: 'teste-com-conteudo.txt', contentBase64: Buffer.from('Olá Mundo').toString('base64') }
    ],
    userId
  );

  console.log('Resultado do Upload:', res);
  console.log('✅ [PASSOU] Upload de arquivos vazios e com conteúdo validado com sucesso!');
}

testUploadEmptyFile().catch(e => {
  console.error('Erro:', e);
  process.exit(1);
});
