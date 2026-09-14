import { EventEmitter } from 'events';
import crypto from 'crypto';
import { sanitizeFileName } from '../security';
import type { IFileJob, ISafeFileJob, ConflictPolicy } from './types';
import { runExtractJob } from './extract';
import { runCompressJob } from './compress';

export class JobManagerService extends EventEmitter {
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

  public getJob(jobId: string): ISafeFileJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    // Retorna sem o AbortController para não quebrar serialização JSON
    const { abortController, ...safeJob } = job;
    return safeJob as ISafeFileJob;
  }

  public cancelJob(jobId: string, userId?: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (userId && job.userId !== userId) {
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
  }): Promise<ISafeFileJob> {
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
    setImmediate(() =>
      runExtractJob(job, archivePath, targetDir, lockKey, {
        emit: (event, payload) => this.emit(event, payload),
        releaseLock: (key) => this.activeLocks.delete(key),
      })
    );

    return this.getJob(jobId)!;
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
  }): Promise<ISafeFileJob> {
    const { appId, userId, paths, archiveName, targetDir } = params;
    const cleanArchiveName = sanitizeFileName(
      archiveName.endsWith('.zip') ? archiveName : `${archiveName}.zip`
    );
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

    setImmediate(() =>
      runCompressJob(job, paths, cleanArchiveName, targetDir, lockKey, {
        emit: (event, payload) => this.emit(event, payload),
        releaseLock: (key) => this.activeLocks.delete(key),
      })
    );

    return this.getJob(jobId)!;
  }
}

export const jobManager = new JobManagerService();
