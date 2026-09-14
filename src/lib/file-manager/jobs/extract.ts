import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import JSZip from 'jszip';
import { validateSafePath, resolveClientRoot } from '../security';
import { syncAppFilesToContainer } from '../server';
import { auditLogOperation } from '../filesystem';
import type { IFileJob } from './types';

export interface JobExecutionCallbacks {
  emit: (event: string, job: IFileJob) => void;
  releaseLock: (lockKey: string) => void;
}

export async function runExtractJob(
  job: IFileJob,
  archivePath: string,
  targetDir: string,
  lockKey: string,
  callbacks: JobExecutionCallbacks
): Promise<void> {
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  callbacks.emit(`job:${job.id}`, job);

  try {
    const clientRoot = await resolveClientRoot(job.appId);
    const fullArchivePath = await validateSafePath(clientRoot, archivePath);

    if (!fsSync.existsSync(fullArchivePath)) {
      throw new Error('Arquivo ZIP de origem não encontrado.');
    }

    const destDirectory = targetDir ? await validateSafePath(clientRoot, targetDir) : clientRoot;
    if (!fsSync.existsSync(destDirectory)) {
      await fs.mkdir(destDirectory, { recursive: true });
    }

    const archiveBuffer = await fs.readFile(fullArchivePath);
    const zip = await JSZip.loadAsync(archiveBuffer);

    const entries = Object.keys(zip.files).filter(
      (name) => !name.startsWith('__MACOSX/') && !name.includes('.DS_Store')
    );

    job.totalFiles = entries.length;
    let extractedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < entries.length; i++) {
      if (job.abortController?.signal.aborted) {
        throw new Error('Operação cancelada pelo usuário.');
      }

      const entryName = entries[i];
      if (!entryName) continue;
      const entry = zip.files[entryName];
      if (!entry) continue;

      job.currentFile = entryName;
      job.processedFiles = i + 1;
      job.progress = job.totalFiles > 0 ? Math.round(((i + 1) / job.totalFiles) * 100) : 100;
      callbacks.emit(`job:${job.id}`, job);

      // Proteção contra Zip Slip
      const safeDestinationPath = await validateSafePath(destDirectory, entryName);

      if (entry.dir) {
        if (!fsSync.existsSync(safeDestinationPath)) {
          await fs.mkdir(safeDestinationPath, { recursive: true, mode: 0o755 });
        }
        continue;
      }

      const parentDir = path.dirname(safeDestinationPath);
      if (!fsSync.existsSync(parentDir)) {
        await fs.mkdir(parentDir, { recursive: true, mode: 0o755 });
      }

      // Resolução de Conflitos
      if (fsSync.existsSync(safeDestinationPath)) {
        if (job.conflictPolicy === 'skip') {
          skippedCount++;
          continue;
        }
        if (job.conflictPolicy === 'abort') {
          throw new Error(`Conflito: o arquivo ${entryName} já existe no destino.`);
        }
      }

      const content = await entry.async('nodebuffer');
      await fs.writeFile(safeDestinationPath, content, { mode: 0o644 });
      extractedCount++;

      // Permite que o event loop processe requisições concorrentes
      if (i % 20 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    // 1. Concluir o job imediatamente para fechar o modal na UI sem esperas desnecessárias
    job.status = 'completed';
    job.progress = 100;
    job.currentFile = 'Extração concluída com sucesso!';
    job.completedAt = new Date().toISOString();
    job.resultSummary = {
      totalFiles: job.totalFiles,
      extractedCount,
      skippedCount,
    };

    callbacks.emit(`job:${job.id}`, job);
    callbacks.releaseLock(lockKey);

    await auditLogOperation(job.userId, job.appId, 'EXTRACT', {
      archivePath,
      targetDir,
      extractedCount,
      skippedCount,
    });

    // 2. Sincronizar com o cluster Swarm em segundo plano (não trava o usuário no modal)
    syncAppFilesToContainer(job.appId)
      .then(() => console.log(`[JobExtract] Sincronização com cluster Swarm concluída para job ${job.id}`))
      .catch((syncErr: any) => console.warn(`[JobExtract Sync Warning]:`, syncErr?.message));
  } catch (err: any) {
    callbacks.releaseLock(lockKey);
    if ((job.status as string) !== 'cancelled') {
      job.status = 'failed';
      job.error = err.message || 'Erro inesperado na descompactação.';
      job.completedAt = new Date().toISOString();
    }
  } finally {
    callbacks.releaseLock(lockKey);
    callbacks.emit(`job:${job.id}`, job);
  }
}
