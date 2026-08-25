import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import { jobManager } from '../src/lib/file-manager/jobs.ts';
import { chmodRealItem, createRealDirectory, createRealFile } from '../src/lib/file-manager/filesystem.ts';
import { resolveClientRoot } from '../src/lib/file-manager/security.ts';

const envText = fs.readFileSync('.env', 'utf8');
envText.split('\n').forEach((line) => {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const appId = 'c35260bc-8b7f-4d21-90fd-6021fd393fbd';
const userId = 'a996f90b-b397-4dcf-b97e-265a335852d3';

async function waitForJob(jobId, timeoutMs = 10000) {
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

async function debugTests() {
  const clientRoot = await resolveClientRoot(appId);

  // Test 6 Debug
  console.log('--- Teste 6: Zip Slip ---');
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
  console.log('Job status:', finishedJob.status, 'Error:', finishedJob.error);
  const fileOutsideExists = fs.existsSync(path.resolve(clientRoot, '..', 'hacked.txt'));
  console.log('File outside exists:', fileOutsideExists);

  // Test 10 Debug
  console.log('\n--- Teste 10: Chmod ---');
  await createRealDirectory(clientRoot, 'teste_chmod_dir');
  await createRealFile(clientRoot, 'teste_chmod_dir/test.html', '<h1>Chmod test</h1>');
  const chmodRes = await chmodRealItem(clientRoot, 'teste_chmod_dir/test.html', '0644');
  console.log('Chmod result:', chmodRes);
}

debugTests();
