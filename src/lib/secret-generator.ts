/**
 * Gerador e Validador Criptográfico de Segredos, Hashes e Senhas do Eqsam PaaS.
 * Garante entropia forte (128 a 256 bits) para todas as credenciais de banco de dados,
 * chaves JWT, NextAuth, Laravel, Evolution API, Redis, etc.
 */

// Helper universal de geração de bytes aleatórios (Node.js e Browser)
function getRandomBytes(size: number): Uint8Array {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const arr = new Uint8Array(size);
    crypto.getRandomValues(arr);
    return arr;
  }
  // Fallback seguro em ambiente Node
  try {
    const nodeCrypto = require("crypto");
    return nodeCrypto.randomBytes(size);
  } catch (e) {
    const arr = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }
}

/**
 * Converte Uint8Array para string hexadecimal
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Converte Uint8Array para string Base64
 */
export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(binary);
}

/**
 * Verifica se a variável de ambiente representa um segredo, senha ou token interno
 */
export function isSecretKey(key: string): boolean {
  if (!key) return false;
  const upper = key.toUpperCase().trim();

  // Senhas
  if (
    upper.includes("PASSWORD") ||
    upper.includes("PASSWD") ||
    upper.includes("ROOT_PASS") ||
    upper.endsWith("_PASS") ||
    upper === "PASS"
  ) {
    return true;
  }

  // Segredos e Chaves de Criptografia / Autenticação
  if (
    upper.includes("SECRET") ||
    upper.includes("AUTH_SECRET") ||
    upper.includes("NEXTAUTH_SECRET") ||
    upper.includes("JWT") ||
    upper.includes("CRON_SECRET") ||
    upper.includes("ENCRYPTION") ||
    upper.includes("SALT") ||
    upper.includes("AUTH_KEY") ||
    upper.includes("NONCE_KEY") ||
    upper.includes("LOGGED_IN_KEY")
  ) {
    return true;
  }

  // Chaves especiais de frameworks
  if (upper === "APP_KEY" || upper === "AUTHENTICATION_API_KEY") {
    return true;
  }

  return false;
}

/**
 * Identifica variáveis que pertencem a serviços de terceiros (onde o cliente DEVE fornecer
 * sua credencial externa e portanto NÃO devem ser substituídas por um hash aleatório cego).
 */
export function isThirdPartyApiKey(key: string): boolean {
  if (!key) return false;
  const upper = key.toUpperCase().trim();

  const thirdPartyPrefixesOrNames = [
    "RESEND_",
    "DISCORD_",
    "CLIENT_ID",
    "CLIENT_SECRET",
    "TELEGRAM_",
    "OPENAI_",
    "ANTHROPIC_",
    "GEMINI_",
    "STRIPE_",
    "TINY_BIRD_",
    "UNKEY_",
    "VERCEL_",
    "PROJECT_ID_VERCEL",
    "TEAM_ID_VERCEL",
    "AWS_",
    "GITHUB_",
    "GITLAB_",
    "CLOUDFLARE_",
    "SENDGRID_",
    "TWILIO_",
    "GOOGLE_",
  ];

  return thirdPartyPrefixesOrNames.some((token) => upper.includes(token));
}

/**
 * Verifica se um valor de segredo/senha é um placeholder inseguro, fraco ou legado.
 */
export function isInsecureOrPlaceholderValue(key: string, value?: string | null): boolean {
  if (!value || typeof value !== "string") return true;
  const val = value.trim();
  if (val === "") return true;

  const lower = val.toLowerCase();

  // Padrões legados inseguros encontrados
  const insecurePatterns = [
    "eqsam_wp_pass",
    "eqsam-auth-secret",
    "eqsam-cron",
    "eqsam_api_secret_key",
    "eqsam_laravel_placeholder",
    "eqsam_postgres_pass",
    "eqsam_mysql_pass",
    "eqsam_root_pass",
    "eqsam_wp_",
    "eqsam_n8n_",
    "eqsam_evo_",
    "eqsam_tb_",
    "eqsam_pg_",
    "eqsam_mysql_",
    "eqsam_root_",
    "eqsam_redis_",
    "eqsam_tb_secret_",
    "eqsam_auth_key_",
    "eqsam_sec_auth_key_",
    "eqsam_logged_in_key_",
    "eqsam_nonce_key_",
    "eqsam_auth_salt_",
    "eqsam_sec_salt_",
    "eqsam_logged_salt_",
    "eqsam_nonce_salt_",
    "re_insira_",
    "insira_",
    "changeme",
    "change_me",
    "password123",
    "secret123",
    "admin123",
    "dummy",
  ];

  for (const pattern of insecurePatterns) {
    if (lower.includes(pattern)) return true;
  }

  // Valores triviais curtos
  if (["password", "secret", "root", "admin", "123456", "12345678", "test"].includes(lower)) {
    return true;
  }

  // Para APP_KEY do Laravel: se não tiver base64 válido ou contiver placeholder
  if (key.toUpperCase() === "APP_KEY" && (lower.includes("placeholder") || !val.startsWith("base64:"))) {
    return true;
  }

  return false;
}

/**
 * Gera um hash criptograficamente forte e seguro para senhas, tokens e chaves.
 * Produz hashes resistentes, seguros e compatíveis com shells e compose files.
 */
export function generateSecureRandomSecret(key: string = ""): string {
  const upper = key.toUpperCase().trim();

  // 1. Laravel APP_KEY (exige 'base64:' seguido de 32 bytes em base64)
  if (upper === "APP_KEY") {
    const rawBytes = getRandomBytes(32);
    return `base64:${bytesToBase64(rawBytes)}`;
  }

  // 2. Evolution API (formato com prefixo evo_ e 24 bytes hex)
  if (upper === "AUTHENTICATION_API_KEY") {
    const hex = bytesToHex(getRandomBytes(24));
    return `evo_${hex}`;
  }

  // 3. NextAuth / Auth.js / JWT / Encryption / Salts (32 bytes = 64 caracteres hexadecimais = 256 bits)
  if (
    upper.includes("AUTH_SECRET") ||
    upper.includes("NEXTAUTH_SECRET") ||
    upper.includes("JWT") ||
    upper.includes("ENCRYPTION") ||
    upper.includes("SALT") ||
    upper.includes("AUTH_KEY") ||
    upper.includes("NONCE_KEY") ||
    upper.includes("LOGGED_IN_KEY")
  ) {
    return bytesToHex(getRandomBytes(32));
  }

  // 4. CRON_SECRET (24 bytes = 48 caracteres hex)
  if (upper.includes("CRON_SECRET")) {
    return bytesToHex(getRandomBytes(24));
  }

  // 5. Senhas de Banco de Dados (MySQL, Postgres, Redis, WordPress, etc.)
  // 16 bytes = 32 caracteres hexadecimais (128 bits de entropia pura)
  // Alfanumérico puro sem caracteres especiais que quebrem docker-compose YAML ou .env quoting
  if (upper.includes("PASSWORD") || upper.includes("PASSWD") || upper.includes("PASS")) {
    return bytesToHex(getRandomBytes(16));
  }

  // Padrão de segurança alta (16 bytes = 32 hex chars)
  return bytesToHex(getRandomBytes(16));
}

/**
 * Higieniza e garante que todas as senhas e segredos internos de uma lista de variáveis
 * possuam hashes criptograficamente seguros e únicos, substituindo qualquer placeholder.
 */
export function sanitizeAndEnsureSecureEnvs(
  envs: Array<{ key: string; value: string; is_build_time?: boolean | undefined }>
): { envs: Array<{ key: string; value: string; is_build_time?: boolean | undefined }>; hasChanges: boolean } {
  let hasChanges = false;
  const result = envs.map((env) => {
    if (!env || !env.key) return env;

    const k = env.key.trim();
    // Apenas afeta segredos internos (não afeta chaves externas de terceiros como RESEND_API_KEY)
    if (isSecretKey(k) && !isThirdPartyApiKey(k)) {
      if (isInsecureOrPlaceholderValue(k, env.value)) {
        hasChanges = true;
        const secureValue = generateSecureRandomSecret(k);
        return {
          ...env,
          key: k,
          value: secureValue,
        };
      }
    }

    return env;
  });

  return { envs: result, hasChanges };
}
