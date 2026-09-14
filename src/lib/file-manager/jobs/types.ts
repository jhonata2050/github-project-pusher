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
  resultSummary?: Record<string, any> | undefined;
  error?: string | undefined;
  createdAt: string;
  startedAt?: string | undefined;
  completedAt?: string | undefined;
  abortController?: AbortController | undefined;
}

export type ISafeFileJob = Omit<IFileJob, 'abortController'>;
