import fs from 'fs';
import path from 'path';

const STORAGE_ROOT = process.env.STORAGE_PATH || path.resolve(process.cwd(), 'storage');
const METRICS_DIR = path.join(STORAGE_ROOT, 'vps-metrics');
const LATEST_DIR = path.join(METRICS_DIR, 'latest');
const HISTORY_DIR = path.join(METRICS_DIR, 'history');

function ensureDirs() {
  if (!fs.existsSync(LATEST_DIR)) fs.mkdirSync(LATEST_DIR, { recursive: true });
  if (!fs.existsSync(HISTORY_DIR)) fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

export interface VPSMetricsPayload {
  vps_id: string;
  cpu: number;
  ram: number;
  disk: number;
  iops_read?: number | null;
  iops_write?: number | null;
  net_in?: number | null;
  net_out?: number | null;
  disk_used_gb?: number | null;
  disk_total_gb?: number | null;
}

export function saveVPSMetrics(data: VPSMetricsPayload) {
  try {
    ensureDirs();
    const now = new Date().toISOString();
    
    const formatted = {
      cpu: Math.round(data.cpu),
      ram: Math.round(data.ram),
      disk: Math.round(data.disk),
      iops: (data.iops_read !== null && data.iops_read !== undefined) || (data.iops_write !== null && data.iops_write !== undefined) ? {
        read: data.iops_read ?? 0,
        write: data.iops_write ?? 0,
        total: (data.iops_read ?? 0) + (data.iops_write ?? 0),
      } : null,
      network: (data.net_in !== null && data.net_in !== undefined) || (data.net_out !== null && data.net_out !== undefined) ? {
        inbound: data.net_in ?? 0,
        outbound: data.net_out ?? 0,
      } : null,
      disk_used_gb: data.disk_used_gb ?? null,
      disk_total_gb: data.disk_total_gb ?? null,
      last_update: now,
    };

    // 1. Salvar última métrica
    const latestFile = path.join(LATEST_DIR, `${data.vps_id}.json`);
    fs.writeFileSync(latestFile, JSON.stringify(formatted, null, 2), 'utf-8');

    // 2. Salvar histórico (máximo 500 registros por VPS)
    const historyFile = path.join(HISTORY_DIR, `${data.vps_id}.json`);
    let history: Array<any> = [];
    if (fs.existsSync(historyFile)) {
      try {
        history = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
      } catch {}
    }
    history.push({
      created_at: now,
      cpu: formatted.cpu,
      ram: formatted.ram,
      disk: formatted.disk,
    });
    if (history.length > 500) {
      history = history.slice(-500);
    }
    fs.writeFileSync(historyFile, JSON.stringify(history), 'utf-8');

    return formatted;
  } catch (err: any) {
    console.error('[VPS-Metrics] Erro ao salvar métricas:', err.message);
    return null;
  }
}

export function getVPSLatestMetrics(vpsId: string) {
  try {
    ensureDirs();
    const latestFile = path.join(LATEST_DIR, `${vpsId}.json`);
    if (fs.existsSync(latestFile)) {
      return JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
    }
  } catch {}
  return null;
}

export function getVPSHistory(vpsId: string, period: '24h' | '7d' | '30d' = '24h') {
  try {
    ensureDirs();
    const historyFile = path.join(HISTORY_DIR, `${vpsId}.json`);
    if (!fs.existsSync(historyFile)) return [];
    
    const history: Array<any> = JSON.parse(fs.readFileSync(historyFile, 'utf-8'));
    const now = Date.now();
    const msMap = {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    };
    const maxAge = msMap[period] || msMap['24h'];
    return history.filter(h => now - new Date(h.created_at).getTime() <= maxAge);
  } catch {}
  return [];
}
