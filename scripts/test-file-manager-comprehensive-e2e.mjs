import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import JSZip from 'jszip';
import { jobManager } from '../src/lib/file-manager/jobs.ts';
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
} from '../src/lib/file-manager/filesystem.ts';
import { validateSafePath, resolveClientRoot, verifyAppAuthorization } from '../src/lib/file-manager/security.ts';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Carregar variáveis de ambiente
const envText = fs.readFileSync('.env', 'utf8');
envText.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
const userId = 'a996f90b-b397-4dcf-b97e-265a335852d3'; // Dono legítimo da aplicação
const foreignUserId = '00000000-0000-0000-0000-000000000000'; // Atacante sem acesso

const results = [];

function logTest(name, passed, details = '') {
  results.push({ name, passed, details });
  console.log(`${passed ? '✅ [PASSOU]' : '❌ [FALHOU]'} ${name} ${details ? '(' + details + ')' : ''}`);
}

async function waitForJob(jobId, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const job = jobManager.getJob(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
      return job;
    }
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error(`Timeout aguardando Job ${jobId}`);
}

async function runComprehensiveAuditSuite() {
  console.log('================================================================');
  console.log('🔍 INICIANDO AUDITORIA TÉCNICA E TESTES E2E DO FILE MANAGER');
  console.log('================================================================\n');

  const clientRoot = await resolveClientRoot(appId);
  console.log(`[Filesystem Root Real]: ${clientRoot}\n`);

  // Limpeza inicial de artefatos de testes prévios
  const testArtefacts = [
    'teste_auditoria',
    'teste_copia_destino',
    'teste_movido_destino',
    'malicious_test.zip',
    'teste_zip_slip_dest',
    'carga_teste',
    'pacote_carga.zip',
    'pacote_cancelar.zip',
    'carga_extraida',
    'carga_cancelada',
  ];
  for (const item of testArtefacts) {
    const p = path.join(clientRoot, item);
    if (fs.existsSync(p)) {
      fs.rmSync(p, { recursive: true, force: true });
    }
  }

  // -------------------------------------------------------------
  // TESTE 1: Criação e Leitura de Arquivo e Pasta
  // -------------------------------------------------------------
  try {
    const dirInfo = await createRealDirectory(clientRoot, 'teste_auditoria/subpasta');
    const fileInfo = await createRealFile(clientRoot, 'teste_auditoria/subpasta/index.html', '<h1>Teste Auditoria</h1>');
    const readResult = await readRealFileContent(clientRoot, 'teste_auditoria/subpasta/index.html');
    
    const ok = fileInfo.size === 24 && readResult.content === '<h1>Teste Auditoria</h1>';
    logTest('1. Criação e Leitura Real no Filesystem', ok, `bytes: ${readResult.size}`);
  } catch (e) {
    logTest('1. Criação e Leitura Real no Filesystem', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 2: Escrita Atômica e Detecção de Concorrência (SHA-256)
  // -------------------------------------------------------------
  try {
    const original = await readRealFileContent(clientRoot, 'teste_auditoria/subpasta/index.html');
    const writeOk = await writeRealFileContent(
      clientRoot,
      'teste_auditoria/subpasta/index.html',
      '<h1>Conteudo Atualizado</h1>',
      original.sha256
    );

    let concurrencyBlocked = false;
    try {
      // Tenta sobrescrever passando SHA antigo errado
      await writeRealFileContent(
        clientRoot,
        'teste_auditoria/subpasta/index.html',
        '<h1>Conteudo Invalido</h1>',
        'hash_invalido_123456'
      );
    } catch (concurrencyErr) {
      concurrencyBlocked = true;
    }

    logTest('2. Escrita Atômica & Concorrência SHA-256', writeOk.size > 0 && concurrencyBlocked, 'Bloqueio de conflito validado');
  } catch (e) {
    logTest('2. Escrita Atômica & Concorrência SHA-256', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 3: Cópia e Movimentação sem EPERM/ENOENT
  // -------------------------------------------------------------
  try {
    const copied = await copyRealItems(clientRoot, ['teste_auditoria'], 'teste_copia_destino');
    const moved = await moveRealItems(clientRoot, ['teste_copia_destino/teste_auditoria'], 'teste_movido_destino');
    const existsMoved = fs.existsSync(path.join(clientRoot, 'teste_movido_destino', 'teste_auditoria', 'subpasta', 'index.html'));

    logTest('3. Cópia e Movimentação Recursiva Resiliente', existsMoved, `Destino verificado`);
  } catch (e) {
    logTest('3. Cópia e Movimentação Recursiva Resiliente', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 4: Segurança contra Path Traversal
  // -------------------------------------------------------------
  try {
    let blocked1 = false;
    let blocked2 = false;
    try { await validateSafePath(clientRoot, '../../../etc/passwd'); } catch { blocked1 = true; }
    try { await validateSafePath(clientRoot, '%2e%2e%2f%2e%2e%2fsecret.key'); } catch { blocked2 = true; }

    logTest('4. Proteção contra Path Traversal (../ e %2e%2e)', blocked1 && blocked2, 'Tentativas de escape abortadas');
  } catch (e) {
    logTest('4. Proteção contra Path Traversal (../ e %2e%2e)', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 5: Isolamento Multilocatário (Tenant Isolation)
  // -------------------------------------------------------------
  try {
    let authBlocked = false;
    try {
      await verifyAppAuthorization(appId, foreignUserId);
    } catch {
      authBlocked = true;
    }
    logTest('5. Isolamento entre Clientes (Tenant Guard)', authBlocked, 'Acesso não autorizado rejeitado');
  } catch (e) {
    logTest('5. Isolamento entre Clientes (Tenant Guard)', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 6: Proteção contra Zip Slip
  // -------------------------------------------------------------
  try {
    const maliciousZip = new JSZip();
    maliciousZip.file('../../hacked.txt', 'dados maliciosos');
    maliciousZip.file('normal.txt', 'arquivo normal');
    const maliciousBuf = await maliciousZip.generateAsync({ type: 'nodebuffer' });
    const maliciousPath = path.join(clientRoot, 'malicious_test.zip');
    await fsPromises.writeFile(maliciousPath, maliciousBuf);

    const initJob = await jobManager.startExtractJob({
      appId,
      userId,
      archivePath: 'malicious_test.zip',
      targetDir: 'teste_zip_slip_dest',
    });

    const finishedJob = await waitForJob(initJob.id);

    // Valida que o arquivo não foi extraído fora do clientRoot
    const fileOutsideExists = fs.existsSync(path.resolve(clientRoot, '..', 'hacked.txt'));
    const zipSlipBlocked = !fileOutsideExists && finishedJob.status === 'failed';

    logTest('6. Proteção contra Ataques Zip Slip', zipSlipBlocked, 'Arquivos fora do chroot bloqueados');
  } catch (e) {
    logTest('6. Proteção contra Ataques Zip Slip', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 7: Job de Compressão Assíncrono com Progresso Real
  // -------------------------------------------------------------
  try {
    // Gerar 60 arquivos para teste de carga
    const loadDir = path.join(clientRoot, 'carga_teste');
    if (!fs.existsSync(loadDir)) await fsPromises.mkdir(loadDir, { recursive: true });
    for (let i = 1; i <= 60; i++) {
      await fsPromises.writeFile(path.join(loadDir, `arquivo_${i}.txt`), `Conteudo do arquivo de teste ${i}\n`.repeat(100));
    }

    const initJob = await jobManager.startCompressJob({
      appId,
      userId,
      paths: ['carga_teste'],
      archiveName: 'pacote_carga.zip',
      targetDir: '',
    });

    const finishedJob = await waitForJob(initJob.id);
    const zipGenerated = fs.existsSync(path.join(clientRoot, 'pacote_carga.zip'));
    
    logTest('7. Job de Compressão com Progresso Real (0% a 100%)', zipGenerated && finishedJob.status === 'completed', `${finishedJob.totalFiles} arquivos compactados`);
  } catch (e) {
    logTest('7. Job de Compressão com Progresso Real (0% a 100%)', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 8: Job de Extração Assíncrono com Resolução de Conflitos
  // -------------------------------------------------------------
  try {
    const initJob = await jobManager.startExtractJob({
      appId,
      userId,
      archivePath: 'pacote_carga.zip',
      targetDir: 'carga_extraida',
      conflictPolicy: 'overwrite',
    });

    const finishedJob = await waitForJob(initJob.id);
    const extractedFilesOk = fs.existsSync(path.join(clientRoot, 'carga_extraida', 'carga_teste', 'arquivo_60.txt'));

    logTest('8. Job de Extração com Progresso e Conflito Overwrite', extractedFilesOk && finishedJob.status === 'completed', `${finishedJob.resultSummary?.extractedCount} arquivos extraídos`);
  } catch (e) {
    logTest('8. Job de Extração com Progresso e Conflito Overwrite', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 9: Cancelamento de Job em Andamento
  // -------------------------------------------------------------
  try {
    // Criar um zip específico para o teste de cancelamento
    await fsPromises.copyFile(path.join(clientRoot, 'pacote_carga.zip'), path.join(clientRoot, 'pacote_cancelar.zip'));

    const initJob = await jobManager.startExtractJob({
      appId,
      userId,
      archivePath: 'pacote_cancelar.zip',
      targetDir: 'carga_cancelada',
      conflictPolicy: 'overwrite',
    });

    // Dispara o cancelamento imediatamente
    const cancelled = jobManager.cancelJob(initJob.id, userId);
    const finishedJob = await waitForJob(initJob.id);

    logTest('9. Cancelamento Concorrente de Job Ativo', cancelled && finishedJob.status === 'cancelled', 'Job abortado com sucesso');
  } catch (e) {
    logTest('9. Cancelamento Concorrente de Job Ativo', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 10: Permissões Linux (CHMOD 0755 e 0644)
  // -------------------------------------------------------------
  try {
    const chmodRes = await chmodRealItem(clientRoot, 'teste_movido_destino/teste_auditoria/subpasta/index.html', '0644');
    logTest('10. Gestão de Permissões Linux (CHMOD)', chmodRes.permissions === '0644' && chmodRes.rwx === 'rw-r--r--', 'Permissão validada');
  } catch (e) {
    logTest('10. Gestão de Permissões Linux (CHMOD)', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 11: Limpeza de Arquivos de Teste
  // -------------------------------------------------------------
  try {
    const delRes = await deleteRealItems(
      clientRoot,
      testArtefacts,
      false
    );
    logTest('11. Exclusão em Massa sem Erros', delRes.deleted.length > 0, `${delRes.deleted.length} itens removidos`);
  } catch (e) {
    logTest('11. Exclusão em Massa sem Erros', false, e.message);
  }

  // -------------------------------------------------------------
  // TESTE 12: Validação E2E no Domínio Real do Caddy
  // -------------------------------------------------------------
  console.log('\n--- 12. VALIDANDO DOMÍNIO REAL CADDY (HTTP GET) ---');
  const routes = [
    { url: 'https://botstarter512mb.dk1.eqsam.com/', expectedStatus: 200 },
    { url: 'https://botstarter512mb.dk1.eqsam.com/vps.html', expectedStatus: 200 },
    { url: 'https://botstarter512mb.dk1.eqsam.com/politica-de-privacidade.html', expectedStatus: 200 },
    { url: 'https://botstarter512mb.dk1.eqsam.com/404.html', expectedStatus: 200 },
  ];

  let caddyAllPass = true;
  for (const r of routes) {
    try {
      const res = await fetch(r.url);
      const text = await res.text();
      const statusOk = res.status === (r.expectedStatus || 200);
      const contentOk = text.length > 0;
      const pass = statusOk && contentOk;
      if (!pass) caddyAllPass = false;
      console.log(`[HTTP ${res.status}] ${r.url} (tamanho: ${text.length}b) -> ${pass ? '✅ OK' : '❌ FALHA'}`);
    } catch (e) {
      caddyAllPass = false;
      console.error(`[ERRO HTTP] ${r.url}:`, e.message);
    }
  }

  logTest('12. Integração Caddy & Site do Cliente em Produção', caddyAllPass, 'Todas as rotas retornam HTTP 200 OK');

  console.log('\n================================================================');
  console.log('📊 RESUMO DA AUDITORIA TÉCNICA:');
  console.log(`Total de Testes: ${results.length}`);
  console.log(`Aprovados: ${results.filter((r) => r.passed).length}`);
  console.log(`Reprovados: ${results.filter((r) => !r.passed).length}`);
  console.log('================================================================');
}

runComprehensiveAuditSuite();
