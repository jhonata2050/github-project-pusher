import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import JSZip from 'jszip';
import { validateSafePath, resolveClientRoot } from '../security';
import { syncAppFilesToContainer } from '../server';
import { auditLogOperation, formatBytes } from '../filesystem';
import type { IFileJob } from './types';
import type { JobExecutionCallbacks } from './extract';

export async function runCompressJob(
  job: IFileJob,
  paths: string[],
  cleanArchiveName: string,
  targetDir: string,
  lockKey: string,
  callbacks: JobExecutionCallbacks
): Promise<void> {
  job.status = 'running';
  job.startedAt = new Date().toISOString();
  callbacks.emit(`job:${job.id}`, job);

  try {
    const clientRoot = await resolveClientRoot(job.appId);
    const destDirectory = targetDir ? await validateSafePath(clientRoot, targetDir) : clientRoot;

    const filesToPack: { fullPath: string; relPath: string }[] = [];

    async function collect(absPath: string, relBase: string) {
      const stats = await fs.stat(absPath);
      if (stats.isDirectory()) {
        const children = await fs.readdir(absPath);
        for (const c of children) {
          await collect(path.join(absPath, c), path.join(relBase, c));
        }
      } else {
        filesToPack.push({ fullPath: absPath, relPath: relBase });
      }
    }

    for (const rel of paths) {
      const full = await validateSafePath(clientRoot, rel);
      if (fsSync.existsSync(full)) {
        await collect(full, path.basename(full));
      }
    }

    job.totalFiles = filesToPack.length;
    const zip = new JSZip();

    for (let i = 0; i < filesToPack.length; i++) {
      if (job.abortController?.signal.aborted) {
        throw new Error('Operação cancelada pelo usuário.');
      }

      const item = filesToPack[i];
      if (!item) continue;
      job.currentFile = item.relPath;
      job.processedFiles = i + 1;
      job.progress = Math.round(((i + 1) / (filesToPack.length + 1)) * 90);
      callbacks.emit(`job:${job.id}`, job);

      const data = await fs.readFile(item.fullPath);
      zip.file(item.relPath, data);

      if (i % 20 === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    job.currentFile = 'Finalizando compressão ZIP...';
    callbacks.emit(`job:${job.id}`, job);

    const zipBuffer = await zip.generateAsync(
      {
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 1 },
      },
      (metadata) => {
        job.progress = 90 + Math.round(metadata.percent * 0.1);
        callbacks.emit(`job:${job.id}`, job);
      }
    );

    const finalPath = path.join(destDirectory, cleanArchiveName);
    await fs.writeFile(finalPath, zipBuffer, { mode: 0o644 });

    job.status = 'completed';
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.resultSummary = {
      archiveName: cleanArchiveName,
      totalPacked: filesToPack.length,
      sizeBytes: zipBuffer.length,
      sizeFormatted: formatBytes(zipBuffer.length),
    };

    await auditLogOperation(job.userId, job.appId, 'COMPRESS', {
      paths,
      archiveName: cleanArchiveName,
      targetDir,
      sizeBytes: zipBuffer.length,
    });

    syncAppFilesToContainer(job.appId).catch(() => {});
  } catch (err: any) {
    if ((job.status as string) !== 'cancelled') {
      job.status = 'failed';
      job.error = err.message || 'Erro inesperado na compressão.';
      job.completedAt = new Date().toISOString();
    }
  } finally {
    callbacks.releaseLock(lockKey);
    callbacks.emit(`job:${job.id}`, job);
  }
}
