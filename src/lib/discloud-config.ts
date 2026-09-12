import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';

export interface DiscloudAppConfig {
  id?: string | undefined;
  name?: string | undefined;
  type: 'bot' | 'site' | 'web';
  main: string;
  ram?: number | undefined;
  autorestart?: boolean | undefined;
  version?: string | undefined;
  apt?: string | undefined;
  runtime: 'nodejs' | 'python' | 'java' | 'static' | 'dockerfile';
  startCommand: string;
  installCommand?: string | undefined;
}

/**
 * Faz o parse de arquivos no formato discloud.config ou eqsam.config (formato INI/KEY=VALUE)
 */
export function parseDiscloudConfig(content: string): Partial<DiscloudAppConfig> {
  const lines = content.split(/\r?\n/);
  const raw: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim().toUpperCase();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      raw[key] = val;
    }
  }

  const type = (raw['TYPE']?.toLowerCase() === 'bot' ? 'bot' : raw['TYPE']?.toLowerCase() === 'site' ? 'site' : 'web') as 'bot' | 'site' | 'web';
  const main = raw['MAIN'] || (type === 'bot' ? 'index.js' : 'index.html');
  const ram = raw['RAM'] ? parseInt(raw['RAM'], 10) : undefined;
  const autorestart = raw['AUTORESTART'] ? raw['AUTORESTART'].toLowerCase() === 'true' : true;
  const version = raw['VERSION'] || 'latest';
  const apt = raw['APT'];
  const name = raw['NAME'] || raw['ID'];

  let runtime: DiscloudAppConfig['runtime'] = 'nodejs';
  if (main.endsWith('.py')) runtime = 'python';
  else if (main.endsWith('.jar')) runtime = 'java';
  else if (main.endsWith('.html') || main.endsWith('.htm')) runtime = 'static';

  let startCommand = `node ${main}`;
  if (runtime === 'python') startCommand = `python3 ${main}`;
  else if (runtime === 'java') startCommand = `java -jar ${main}`;
  else if (runtime === 'static') startCommand = 'caddy run --config /etc/caddy/Caddyfile';

  return {
    id: raw['ID'],
    name,
    type,
    main,
    ram,
    autorestart,
    version,
    apt,
    runtime,
    startCommand,
  };
}

/**
 * Inspeciona o diretório raiz da aplicação e autodetecta ou carrega as configurações
 * (estilo Discloud / Railway), priorizando discloud.config / eqsam.config.
 */
export async function detectProjectConfig(clientRoot: string): Promise<DiscloudAppConfig> {
  // 1. Procurar discloud.config ou eqsam.config explícito
  const discloudPath = path.join(clientRoot, 'discloud.config');
  const eqsamPath = path.join(clientRoot, 'eqsam.config');

  let configFile: string | null = null;
  if (fsSync.existsSync(discloudPath)) configFile = discloudPath;
  else if (fsSync.existsSync(eqsamPath)) configFile = eqsamPath;

  if (configFile) {
    try {
      const content = await fs.readFile(configFile, 'utf-8');
      const parsed = parseDiscloudConfig(content);
      return {
        type: parsed.type || 'bot',
        main: parsed.main || 'index.js',
        ram: parsed.ram || 512,
        autorestart: parsed.autorestart ?? true,
        version: parsed.version || 'latest',
        apt: parsed.apt,
        name: parsed.name,
        runtime: parsed.runtime || 'nodejs',
        startCommand: parsed.startCommand || `node ${parsed.main || 'index.js'}`,
        installCommand: parsed.runtime === 'python' ? 'pip install -r requirements.txt' : 'npm install --omit=dev',
      };
    } catch (e) {
      console.warn('[DiscloudConfig] Erro ao ler arquivo de configuração:', e);
    }
  }

  // 2. Autodetecção baseada em package.json (Node.js)
  const pkgPath = path.join(clientRoot, 'package.json');
  if (fsSync.existsSync(pkgPath)) {
    try {
      const pkgContent = await fs.readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);

      const isBot =
        !!pkg.dependencies?.['discord.js'] ||
        !!pkg.dependencies?.['@whiskeysockets/baileys'] ||
        !!pkg.dependencies?.['@wppconnect-team/wppconnect'] ||
        !!pkg.dependencies?.['venom-bot'] ||
        !!pkg.dependencies?.['telegraf'] ||
        !!pkg.dependencies?.['grammy'] ||
        pkg.name?.toLowerCase().includes('bot');

      let main = pkg.main || 'index.js';
      if (!fsSync.existsSync(path.join(clientRoot, main))) {
        if (fsSync.existsSync(path.join(clientRoot, 'bot.js'))) main = 'bot.js';
        else if (fsSync.existsSync(path.join(clientRoot, 'index.js'))) main = 'index.js';
        else if (fsSync.existsSync(path.join(clientRoot, 'src', 'index.js'))) main = 'src/index.js';
        else if (fsSync.existsSync(path.join(clientRoot, 'server.js'))) main = 'server.js';
      }

      const startCmd = pkg.scripts?.start ? 'npm start' : `node ${main}`;

      return {
        name: pkg.name,
        type: isBot ? 'bot' : 'web',
        main,
        ram: 512,
        autorestart: true,
        version: 'latest',
        runtime: 'nodejs',
        startCommand: startCmd,
        installCommand: 'npm install --omit=dev',
      };
    } catch (e) {}
  }

  // 3. Autodetecção baseada em Python (requirements.txt / main.py / bot.py)
  const pyMain = fsSync.existsSync(path.join(clientRoot, 'main.py'))
    ? 'main.py'
    : fsSync.existsSync(path.join(clientRoot, 'bot.py'))
    ? 'bot.py'
    : fsSync.existsSync(path.join(clientRoot, 'app.py'))
    ? 'app.py'
    : null;

  if (pyMain || fsSync.existsSync(path.join(clientRoot, 'requirements.txt'))) {
    const main = pyMain || 'main.py';
    return {
      type: 'bot',
      main,
      ram: 512,
      autorestart: true,
      version: '3.11',
      runtime: 'python',
      startCommand: `python3 ${main}`,
      installCommand: fsSync.existsSync(path.join(clientRoot, 'requirements.txt')) ? 'pip install -r requirements.txt' : undefined,
    };
  }

  // 4. Fallback padrão: Site estático / Caddy
  return {
    type: 'site',
    main: 'index.html',
    ram: 256,
    autorestart: true,
    version: 'latest',
    runtime: 'static',
    startCommand: 'caddy run --config /etc/caddy/Caddyfile',
  };
}
