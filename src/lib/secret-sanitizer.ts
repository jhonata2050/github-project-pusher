/**
 * Camada centralizada de higienização e sanitização de credenciais e segredos.
 * Garante que senhas, tokens, hashes, chaves privadas e connection strings
 * nunca vazem em logs de contêineres, terminais, exceções, payloads ou respostas de API.
 */

const SECRET_PATTERNS = [
  // Parâmetros chave=valor (ex: password=..., passwd=..., token=..., secret=..., api_key=...)
  /((?:password|passwd|pwd|secret|token|api[_-]?key|auth[_-]?secret|private[_-]?key|session[_-]?secret)\s*[:=]\s*)([^\s&"'>;]+)/gi,
  
  // Headers HTTP de Autorização (ex: Authorization: Bearer eyJhbGci...)
  /(Authorization\s*:\s*Bearer\s+)([A-Za-z0-9_.-]{10,})/gi,
  /(Bearer\s+)([A-Za-z0-9_.-]{10,})/gi,
  
  // Connection strings de Banco de Dados com usuário e senha
  // ex: postgres://user:pass@host:5432/db, mysql://root:pass@host/db
  /((?:postgres(?:ql)?|mysql|mariadb|redis|mongodb(?:\+srv)?):\/\/[^:]+:)([^@]+)(@)/gi,
  
  // Blocos de Chaves Privadas PEM (RSA, OPENSSH, EC, etc.)
  /-----BEGIN [A-Z0-9 ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]+PRIVATE KEY-----/gi,
  
  // Senhas do Swarm/SSH padrão conhecidas em texto puro (defesa em profundidade)
  /uvU8Ly3S6IaXW1fE/g,
];

/**
 * Higieniza um texto arbitrário substituindo qualquer ocorrência de segredo por máscara segura.
 */
export function sanitizeSecrets(text: string): string {
  if (!text || typeof text !== "string") return text;

  let sanitized = text;

  // 1. Mascarar connection strings de bancos de dados: postgres://user:******@host/db
  sanitized = sanitized.replace(
    /((?:postgres(?:ql)?|mysql|mariadb|redis|mongodb(?:\+srv)?):\/\/[^:]+:)([^@]+)(@)/gi,
    "$1******$3"
  );

  // 2. Mascarar blocos completos de chaves privadas (RSA, OPENSSH, EC, PGP, etc.)
  sanitized = sanitized.replace(
    /-----BEGIN[^\r\n-]+PRIVATE KEY-----[\s\S]*?-----END[^\r\n-]+PRIVATE KEY-----/gi,
    "[REDACTED_PRIVATE_KEY]"
  );

  // 3. Mascarar Bearer tokens e cabeçalhos de autorização
  sanitized = sanitized.replace(
    /(Authorization\s*:\s*Bearer\s+)([A-Za-z0-9_.-]{6,})/gi,
    "$1******"
  );
  sanitized = sanitized.replace(
    /(Bearer\s+)([A-Za-z0-9_.-]{6,})/gi,
    "$1******"
  );

  // 4. Mascarar formatos chave=valor e JSON com ou sem aspas, incluindo prefixos (ex: DB_PASSWORD, access_token)
  sanitized = sanitized.replace(
    /((?:["']?[a-zA-Z0-9_]*(?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?token|private[_-]?key|auth[_-]?secret)[a-zA-Z0-9_]*["']?\s*[:=]\s*["']?))([^"'\s&;,>\r\n}{]+)(["']?)/gi,
    "$1******$3"
  );

  // 5. Mascarar senhas conhecidas residuais (defesa em profundidade)
  sanitized = sanitized.replace(/uvU8Ly3S6IaXW1fE/g, "******");

  return sanitized;
}

/**
 * Sanitiza recursivamente objetos e payloads antes de logar ou retornar via API.
 */
export function sanitizeObject<T>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === "string") {
    return sanitizeSecrets(data) as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeObject(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const sanitizedObj: Record<string, unknown> = {};
    const sensitiveKeys = new Set([
      "password",
      "passwd",
      "pwd",
      "secret",
      "token",
      "api_key",
      "apikey",
      "ssh_password",
      "sshpassword",
      "private_key",
      "privatekey",
      "ssh_key",
      "sshkey",
      "database_url",
    ]);

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      const isKeySensitive =
        sensitiveKeys.has(lowerKey) ||
        lowerKey.includes("password") ||
        lowerKey.includes("token") ||
        lowerKey.includes("secret") ||
        lowerKey.includes("private_key") ||
        lowerKey.includes("api_key") ||
        lowerKey.includes("apikey") ||
        lowerKey.includes("auth_key") ||
        lowerKey.includes("db_pass");

      if (isKeySensitive) {
        if (Array.isArray(value)) {
          sanitizedObj[key] = value.map(() => "******");
        } else if (typeof value === "object" && value !== null) {
          sanitizedObj[key] = sanitizeObject(value);
        } else {
          sanitizedObj[key] = "******";
        }
      } else if (typeof value === "string") {
        sanitizedObj[key] = sanitizeSecrets(value);
      } else if (typeof value === "object") {
        sanitizedObj[key] = sanitizeObject(value);
      } else {
        sanitizedObj[key] = value;
      }
    }
    return sanitizedObj as T;
  }

  return data;
}

/**
 * Formata um valor de segredo mascarado para apresentação sob demanda na UI (ex: '••••••••').
 */
export function maskSecretValue(val: string): string {
  if (!val) return "";
  return "••••••••";
}
