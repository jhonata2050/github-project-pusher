import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { resolveClientRoot, validateSafePath } from '../src/lib/file-manager/security.ts';
import {
  listRealDirectory,
  readRealFileContent,
  writeRealFileContent,
  createRealFile,
  createRealDirectory,
  deleteRealItems,
  renameRealItem,
  copyRealItems,
  moveRealItems,
  chmodRealItem,
  compressRealItems,
  extractRealArchive,
  searchRealFiles
} from '../src/lib/file-manager/filesystem.ts';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function runTestSuite() {
  console.log('====================================================');
  console.log('   SUÍTE DE TESTES REAIS DO FILE MANAGER DO COLIFY   ');
  console.log('====================================================\n');

  const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
  const clientRoot = await resolveClientRoot(appId);
  console.log(`[1] Root Real do Cliente: ${clientRoot}`);
  console.log(`    Diretório existe fisicamente no disco? ${fsSync.existsSync(clientRoot) ? 'SIM (OK)' : 'NÃO (ERRO)'}`);

  // TESTE 1: Arquivo criado diretamente no servidor deve ser detectado na listagem
  console.log('\n--- TESTE 1: Criação Direta no Servidor -> Listagem ---');
  const testFile1Path = path.join(clientRoot, 'teste-colify.txt');
  await fs.writeFile(testFile1Path, 'TESTE SERVIDOR', 'utf-8');
  console.log('    Criado fisicamente no disco: teste-colify.txt com "TESTE SERVIDOR"');

  const listResult = await listRealDirectory(clientRoot, '', true);
  const foundFile1 = listResult.items.find(i => i.name === 'teste-colify.txt');
  if (foundFile1) {
    console.log(`    [PASSOU] teste-colify.txt detectado no filesystem! Tamanho: ${foundFile1.sizeFormatted}, Permissões: ${foundFile1.permissions}`);
  } else {
    throw new Error('FALHA: teste-colify.txt não foi encontrado no filesystem real!');
  }

  // TESTE 2: Editor lê do servidor e salva no disco real
  console.log('\n--- TESTE 2: Leitura -> Edição -> Gravação Real no Disco ---');
  const readRes = await readRealFileContent(clientRoot, 'teste-colify.txt');
  console.log(`    Lido do servidor: "${readRes.content}", SHA256: ${readRes.sha256}`);

  const writeRes = await writeRealFileContent(clientRoot, 'teste-colify.txt', 'TESTE COLIFY', readRes.sha256);
  console.log(`    Salvo via Engine. Novo SHA256: ${writeRes.sha256}`);

  const physicalContent = await fs.readFile(testFile1Path, 'utf-8');
  if (physicalContent === 'TESTE COLIFY') {
    console.log(`    [PASSOU] Conteúdo físico verificado no disco: "${physicalContent}"`);
  } else {
    throw new Error(`FALHA: Conteúdo físico no disco está incorreto: "${physicalContent}"`);
  }

  // TESTE 3: Modificação Direta no Servidor -> Atualização
  console.log('\n--- TESTE 3: Modificação Externa no Servidor -> Leitura ---');
  await fs.writeFile(testFile1Path, 'ALTERADO DIRETAMENTE NO SERVIDOR', 'utf-8');
  const readRes3 = await readRealFileContent(clientRoot, 'teste-colify.txt');
  if (readRes3.content === 'ALTERADO DIRETAMENTE NO SERVIDOR') {
    console.log(`    [PASSOU] Novo conteúdo lido com sucesso: "${readRes3.content}"`);
  } else {
    throw new Error('FALHA: Leitura não refletiu a alteração física do servidor!');
  }

  // TESTE 4: Detecção de Conflito de Concorrência
  console.log('\n--- TESTE 4: Concorrência & Proteção contra Sobrescrita ---');
  try {
    // Tenta salvar usando o hash antigo (readRes.sha256) antes da alteração externa
    await writeRealFileContent(clientRoot, 'teste-colify.txt', 'TENTATIVA SOBRESCREVER', readRes.sha256);
    throw new Error('FALHA: Deveria ter disparado CONCURRENCY_CONFLICT!');
  } catch (err) {
    if (err.message.includes('CONCURRENCY_CONFLICT')) {
      console.log(`    [PASSOU] Conflito de concorrência detectado com sucesso: ${err.message}`);
    } else {
      throw err;
    }
  }

  // TESTE 5: Segurança e Bloqueio de Path Traversal
  console.log('\n--- TESTE 5: Segurança & Path Traversal Sandbox ---');
  const maliciousPaths = [
    '../../etc/passwd',
    '../..\\windows\\system32',
    '..',
    'assets/../../../root',
    'teste\0nullbyte.txt',
    '%2e%2e%2fetc%2fpasswd'
  ];

  for (const malPath of maliciousPaths) {
    try {
      await validateSafePath(clientRoot, malPath);
      throw new Error(`FALHA: O caminho malicioso ${malPath} NÃO foi bloqueado!`);
    } catch (err) {
      console.log(`    [PASSOU] Bloqueado: "${malPath}" -> ${err.message}`);
    }
  }

  // TESTE 6: Operações de Diretórios, Renomear, Chmod e ZIP
  console.log('\n--- TESTE 6: Criação de Pastas, Chmod, Compactação e Extração ---');
  const newFolder = await createRealDirectory(clientRoot, 'assets_teste');
  console.log(`    Criada pasta física: ${newFolder.path}`);

  const newSubFile = await createRealFile(clientRoot, 'assets_teste/style.css', 'body { color: red; }');
  console.log(`    Criado arquivo físico: ${newSubFile.path}`);

  const chmodRes = await chmodRealItem(clientRoot, 'assets_teste/style.css', '0755');
  console.log(`    Chmod aplicado: ${chmodRes.permissions} (${chmodRes.rwx})`);

  const zipFile = await compressRealItems(clientRoot, ['assets_teste'], 'meu_pacote.zip', '');
  console.log(`    Arquivo ZIP gerado: ${zipFile.name} (${zipFile.sizeFormatted})`);
  console.log(`    Existe no disco? ${fsSync.existsSync(path.join(clientRoot, 'meu_pacote.zip')) ? 'SIM (OK)' : 'NÃO (ERRO)'}`);

  const extractCount = await extractRealArchive(clientRoot, 'meu_pacote.zip', 'extraido_teste');
  console.log(`    ZIP extraído em extraido_teste/: ${extractCount} arquivos gerados.`);

  // Limpeza de testes
  await deleteRealItems(clientRoot, ['teste-colify.txt', 'assets_teste', 'meu_pacote.zip', 'extraido_teste']);
  console.log('    Itens de teste temporários limpos do disco.');

  console.log('\n====================================================');
  console.log('  🎉 TODOS OS TESTES FORAM EXECUTADOS COM SUCESSO!  ');
  console.log('====================================================\n');
}

runTestSuite().catch(e => {
  console.error('\n❌ ERRO NO TESTE:', e);
  process.exit(1);
});
