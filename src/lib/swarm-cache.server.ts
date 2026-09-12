/**
 * Camada de Cache Abstrata e Deduplicação de Requisições (Thundering Herd Prevention)
 * 
 * Fornece interface plugável para cache com implementação em memória por padrão,
 * pronta para migração transparente para Redis/Valkey no futuro.
 * Implementa deduplicação estrita de chamadas simultâneas em trânsito (in-flight promises)
 * para consultas de telemetria e leitura.
 */

export interface CacheStore {
  get<T>(key: string): Promise<T | null> | (T | null);
  set<T>(key: string, value: T, ttlMs: number): Promise<void> | void;
  del(key: string): Promise<void> | void;
  clear(): Promise<void> | void;
}

interface MemoryCacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface EqsamCacheGlobals {
  __eqsam_memory_cache?: Map<string, MemoryCacheEntry<unknown>>;
  __eqsam_inflight_promises?: Map<string, Promise<unknown>>;
  __eqsam_cache_metrics?: CacheMetrics;
}

const cacheGlobals = globalThis as unknown as EqsamCacheGlobals;

export class MemoryCacheStore implements CacheStore {
  private store: Map<string, MemoryCacheEntry<unknown>>;

  constructor() {
    // Manter em globalThis para persistência durante HMR
    this.store =
      cacheGlobals.__eqsam_memory_cache ||
      (cacheGlobals.__eqsam_memory_cache = new Map<string, MemoryCacheEntry<unknown>>());
  }

  public get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  public del(key: string): void {
    this.store.delete(key);
  }

  public clear(): void {
    this.store.clear();
  }
}

// Instância padrão do cache store
export const defaultCacheStore: CacheStore = new MemoryCacheStore();

// Map de promessas em trânsito para deduplicação (in-flight deduplication)
const inflightPromises: Map<string, Promise<unknown>> =
  cacheGlobals.__eqsam_inflight_promises ||
  (cacheGlobals.__eqsam_inflight_promises = new Map<string, Promise<unknown>>());

export interface CacheMetrics {
  cacheHits: number;
  cacheMisses: number;
  inflightDeduplications: number;
}

const cacheMetrics: CacheMetrics =
  cacheGlobals.__eqsam_cache_metrics ||
  (cacheGlobals.__eqsam_cache_metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    inflightDeduplications: 0,
  });

export function getCacheMetrics(): CacheMetrics {
  return { ...cacheMetrics };
}

export function resetCacheMetrics(): void {
  cacheMetrics.cacheHits = 0;
  cacheMetrics.cacheMisses = 0;
  cacheMetrics.inflightDeduplications = 0;
}

/**
 * Deduplica chamadas simultâneas a uma função de leitura/telemetria.
 * Se 20 usuários requisitarem a mesma informação enquanto a operação física está ocorrendo,
 * apenas 1 operação real é executada e as outras 19 aguardam a mesma Promise.
 * 
 * ATENÇÃO: Nunca utilizar para mutações (deploy, restart, stop, start, delete).
 */
export async function deduplicateInflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflightPromises.get(key);
  if (existing) {
    cacheMetrics.inflightDeduplications++;
    return existing as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fn();
    } finally {
      inflightPromises.delete(key);
    }
  })();

  inflightPromises.set(key, promise);
  return promise;
}

/**
 * Helper unificado: Cache First + Inflight Deduplication.
 * 1. Se o valor estiver no cache e válido -> retorna imediatamente (0ms).
 * 2. Se for cache miss -> executa deduplicado, salva no cache e retorna.
 */
export async function getOrCompute<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
  cacheStore: CacheStore = defaultCacheStore
): Promise<T> {
  const cached = await cacheStore.get<T>(key);
  if (cached !== null && cached !== undefined) {
    cacheMetrics.cacheHits++;
    return cached;
  }

  cacheMetrics.cacheMisses++;

  return deduplicateInflight(key, async () => {
    // Checagem dupla após adquirir a Promise
    const doubleCheck = await cacheStore.get<T>(key);
    if (doubleCheck !== null && doubleCheck !== undefined) {
      cacheMetrics.cacheHits++;
      return doubleCheck;
    }

    const fresh = await fn();
    await cacheStore.set(key, fresh, ttlMs);
    return fresh;
  });
}
