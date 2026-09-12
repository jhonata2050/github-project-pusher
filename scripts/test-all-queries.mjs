process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE env variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function scanDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      scanDir(filePath, fileList);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = [
  ...scanDir(path.join(rootDir, 'src/routes')),
  ...scanDir(path.join(rootDir, 'src/lib')),
  ...scanDir(path.join(rootDir, 'src/components'))
];

const queryRegex = /\.from\(\s*['"`]([a-zA-Z0-9_-]+)['"`]\s*\)\s*\.select\(\s*['"`]([^'"`]+)['"`]/g;

const queriesFound = [];

for (const f of files) {
  const content = fs.readFileSync(f, 'utf-8');
  const normalizedFile = path.relative(rootDir, f).replace(/\\/g, '/');
  let match;
  while ((match = queryRegex.exec(content)) !== null) {
    const table = match[1];
    const select = match[2].replace(/\s+/g, ' ').trim();
    queriesFound.push({ file: normalizedFile, table, select });
  }
}

console.log(`Found ${queriesFound.length} select queries across the codebase to test...`);

async function testAll() {
  const broken = [];
  const checked = new Set();

  for (const q of queriesFound) {
    const key = `${q.table}:::${q.select}`;
    if (checked.has(key)) continue;
    checked.add(key);

    try {
      const { error } = await supabase.from(q.table).select(q.select).limit(1);
      if (error) {
        broken.push({
          file: q.file,
          table: q.table,
          select: q.select,
          error: error.message,
          code: error.code
        });
      }
    } catch (e) {
      broken.push({
        file: q.file,
        table: q.table,
        select: q.select,
        error: e.message
      });
    }
  }

  console.log(`\n=== BROKEN QUERIES FOUND (${broken.length}) ===\n`);
  console.log(JSON.stringify(broken, null, 2));
}

testAll();
