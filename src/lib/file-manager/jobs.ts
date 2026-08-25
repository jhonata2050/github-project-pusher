import { EventEmitter } from 'events';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import JSZip from 'jszip';
import { validateSafePath, resolveClientRoot, sanitizeFileName } from './security';
import { syncAppFilesToCoolify } from './server';
import { auditLogOperation, formatBytes } from './filesystem';

export type JobType = 'extract' | 'compress' | 'bulk_delete' | 'bulk_move' | 'bulk_copy';
export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type ConflictPolicy = 'overwrite' | 'skip' | 'abort';

export interface IFileJob {
  id: string;
  appId: string;
  userId: string;
  type: JobType;
  status: JobStatus;
  progress: number;
  totalFiles: number;
  processedFiles: number;
  currentFile: string;
  conflictPolicy: ConflictPolicy;
  resultSummary?: Record<string, any>;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  abortController?: AbortController;
}

class JobManagerService extends EventEmitter {
  private jobs: Map<string, IFileJob> = new Map();
  private activeLocks: Set<string> = new Set();

  constructor() {
    super();
    // Limpeza periódica de jobs antigos (mais de 1 hora)
    setInterval(() => this.cleanupOldJobs(), 1000 * 60 * 30);
  }

  private cleanupOldJobs() {
    const oneHourAgo = Date.now() - 1000 * 60 * 60;
    for (const [id, job] of this.jobs.entries()) {
      if (
        (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') &&
        new Date(job.createdAt).getTime() < oneHourAgo
      ) {
        this.jobs.delete(id);
      }
    }
  }

  public getJob(jobId: string): IFileJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    // Retorna sem o AbortController para não quebrar serialização JSON
    const { abortController, ...safeJob } = job;
    return safeJob as IFileJob;
  }

  public cancelJob(jobId: string, userId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.userId !== userId) {
      throw new Error('Acesso negado para cancelar este Job.');
    }
    if (job.status === 'running' || job.status === 'pending') {
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      if (job.abortController) {
        job.abortController.abort();
      }
      this.emit(`job:${job.id}`, job);
      return true;
    }
    return false;
  }

  /**
   * INICIA JOB DE EXTRAÇÃO COM PROGRESSO REAL E DETECÇÃO DE ZIP SLIP
   */
  public async startExtractJob(params: {
    appId: string;
    userId: string;
    archivePath: string;
    targetDir: string;
    conflictPolicy?: ConflictPolicy;
  }): Promise<IFileJob> {
    const { appId, userId, archivePath, targetDir, conflictPolicy = 'overwrite' } = params;
    const lockKey = `extract:${appId}:${archivePath}`;

    if (this.activeLocks.has(lockKey)) {
      throw new Error('Já existe uma operação de descompactação em andamento para este arquivo.');
    }

    const jobId = crypto.randomUUID();
    const abortController = new AbortController();

    const job: IFileJob = {
      id: jobId,
      appId,
      userId,
      type: 'extract',
      status: 'pending',
      progress: 0,
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      conflictPolicy,
      createdAt: new Date().toISOString(),
      abortController,
    };

    this.jobs.set(jobId, job);
    this.activeLocks.add(lockKey);

    // Executa em segundo plano para não bloquear a resposta HTTP
    setImmediate(() => this.runExtractJob(job, archivePath, targetDir, lockKey));

    return this.getJob(jobId)!;
  }

  private async runExtractJob(
    job: IFileJob,
    archivePath: string,
    targetDir: string,
    lockKey: string
  ) {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.emit(`job:${job.id}`, job);

    try {
      const clientRoot = await resolveClientRoot(job.appId);
      const fullArchivePath = await validateSafePath(clientRoot, archivePath);

      if (!fsSync.existsSync(fullArchivePath)) {
        throw new Error('Arquivo compactado não encontrado.');
      }

      const destDirectory = await validateSafePath(clientRoot, targetDir);
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
        const entry = zip.files[entryName];

        job.currentFile = entryName;
        job.processedFiles = i + 1;
        job.progress = job.totalFiles > 0 ? Math.round(((i + 1) / job.totalFiles) * 100) : 100;
        this.emit(`job:${job.id}`, job);

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

      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date().toISOString();
      job.resultSummary = {
        totalFiles: job.totalFiles,
        extractedCount,
        skippedCount,
      };

      await auditLogOperation(job.userId, job.appId, 'EXTRACT', {
        archivePath,
        targetDir,
        extractedCount,
        skippedCount,
      });

      // Disparar sincronização com Caddy em background
      syncAppFilesToCoolify(job.appId).catch(() => {});
    } catch (err: any) {
      if (job.status !== 'cancelled') {
        job.status = 'failed';
        job.error = err.message || 'Erro inesperado na descompactação.';
        job.completedAt = new Date().toISOString();
      }
    } finally {
      this.activeLocks.delete(lockKey);
      this.emit(`job:${job.id}`, job);
    }
  }

  /**
   * INICIA JOB DE COMPRESSÃO COM PROGRESSO REAL
   */
  public async startCompressJob(params: {
    appId: string;
    userId: string;
    paths: string[];
    archiveName: string;
    targetDir: string;
  }): Promise<IFileJob> {
    const { appId, userId, paths, archiveName, targetDir } = params;
    const cleanArchiveName = sanitizeFileName(archiveName.endsWith('.zip') ? archiveName : `${archiveName}.zip`);
    const lockKey = `compress:${appId}:${targetDir}/${cleanArchiveName}`;

    if (this.activeLocks.has(lockKey)) {
      throw new Error('Já existe uma operação de compressão em andamento com este nome.');
    }

    const jobId = crypto.randomUUID();
    const abortController = new AbortController();

    const job: IFileJob = {
      id: jobId,
      appId,
      userId,
      type: 'compress',
      status: 'pending',
      progress: 0,
      totalFiles: 0,
      processedFiles: 0,
      currentFile: '',
      conflictPolicy: 'overwrite',
      createdAt: new Date().toISOString(),
      abortController,
    };

    this.jobs.set(jobId, job);
    this.activeLocks.add(lockKey);

    setImmediate(() => this.runCompressJob(job, paths, cleanArchiveName, targetDir, lockKey));

    return this.getJob(jobId)!;
  }

  private async runCompressJob(
    job: IFileJob,
    paths: string[],
    cleanArchiveName: string,
    targetDir: string,
    lockKey: string
  ) {
    job.status = 'running';
    job.startedAt = new Date().toISOString();
    this.emit(`job:${job.id}`, job);

    try {
      const clientRoot = await resolveClientRoot(job.appId);
      const destDirectory = await validateSafePath(clientRoot, targetDir);

      if (!fsSync.existsSync(destDirectory)) {
        await fs.mkdir(destDirectory, { recursive: true });
      }

      const filesToPack: Array<{ fullPath: string; relPath: string }> = [];

      async function collect(absPath: string, relBase: string) {
        const stat = await fs.stat(absPath);
        if (stat.isDirectory()) {
          const entries = await fs.readdir(absPath);
          for (const ent of entries) {
            await collect(path.join(absPath, ent), relBase ? `${relBase}/${ent}` : ent);
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
        job.currentFile = item.relPath;
        job.processedFiles = i + 1;
        job.progress = Math.round(((i + 1) / (filesToPack.length + 1)) * 90);
        this.emit(`job:${job.id}`, job);

        const data = await fs.readFile(item.fullPath);
        zip.file(item.relPath, data);

        if (i % 20 === 0) {
          await new Promise((r) => setTimeout(r, 0));
        }
      }

      job.currentFile = 'Finalizando compressão ZIP...';
      this.emit(`job:${job.id}`, job);

      const zipBuffer = await zip.generateAsync(
        {
          type: 'nodebuffer',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        },
        (metadata) => {
          job.progress = 90 + Math.round(metadata.percent * 0.1);
          this.emit(`job:${job.id}`, job);
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

      syncAppFilesToCoolify(job.appId).catch(() => {});
    } catch (err: any) {
      if (job.status !== 'cancelled') {
        job.status = 'failed';
        job.error = err.message || 'Erro inesperado na compressão.';
        job.completedAt = new Date().toISOString();
      }
    } finally {
      this.activeLocks.delete(lockKey);
      this.emit(`job:${job.id}`, job);
    }
  }
}

export const jobManager = new JobManagerService();
