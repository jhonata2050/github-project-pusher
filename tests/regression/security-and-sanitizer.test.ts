import { describe, it, expect } from "vitest";
import path from "path";
import { validateSafePath } from "@/lib/file-manager/security";
import { sanitizeSecrets } from "@/lib/secret-sanitizer";

describe("Segurança do File Manager (Path Traversal & Chroot Defense)", () => {
  const fakeRoot = path.resolve(process.cwd(), "storage", "test-app-root");

  it("deve permitir caminhos válidos e normalizados dentro da raiz", async () => {
    const safeSub = await validateSafePath(fakeRoot, "src/index.js");
    expect(safeSub).toBe(path.resolve(fakeRoot, "src/index.js"));
  });

  it("deve permitir a raiz quando o caminho relativo for vazio, '.' ou '/'", async () => {
    expect(await validateSafePath(fakeRoot, "")).toBe(fakeRoot);
    expect(await validateSafePath(fakeRoot, ".")).toBe(fakeRoot);
    expect(await validateSafePath(fakeRoot, "/")).toBe(fakeRoot);
  });

  it("deve BLOQUEAR tentativas clássicas de Directory Traversal (../)", async () => {
    await expect(validateSafePath(fakeRoot, "../../../etc/passwd")).rejects.toThrow(
      /Acesso negado: Tentativa de path traversal bloqueada/
    );
  });

  it("deve BLOQUEAR tentativas com barras invertidas no estilo Windows (..\\)", async () => {
    await expect(validateSafePath(fakeRoot, "..\\..\\Windows\\System32")).rejects.toThrow(
      /Acesso negado: Tentativa de path traversal bloqueada/
    );
  });

  it("deve BLOQUEAR tentativas com URL encoding (%2e%2e%2f)", async () => {
    await expect(validateSafePath(fakeRoot, "%2e%2e%2f%2e%2e%2fetc%2fshadow")).rejects.toThrow(
      /Acesso negado: Tentativa de path traversal bloqueada/
    );
  });

  it("deve BLOQUEAR caracteres nulos (Null Byte Injection)", async () => {
    await expect(validateSafePath(fakeRoot, "index.php\0.jpg")).rejects.toThrow(
      /Caracteres inválidos ou nulos/
    );
  });
});

describe("Sanitização de Segredos e Credenciais em Logs (Secret Sanitizer)", () => {
  it("deve mascarar senhas em connection strings de banco de dados", () => {
    const raw = "postgres://postgres:SuperSecret123@192.168.1.50:5432/eqsam_db";
    const cleaned = sanitizeSecrets(raw);
    expect(cleaned).not.toContain("SuperSecret123");
    expect(cleaned).toContain("postgres://postgres:******@192.168.1.50:5432/eqsam_db");
  });

  it("deve mascarar Bearer tokens e headers de autorização", () => {
    const raw = "Request Header Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
    const cleaned = sanitizeSecrets(raw);
    expect(cleaned).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9");
    expect(cleaned).toContain("Authorization: Bearer ******");
  });

  it("deve mascarar blocos inteiros de chaves privadas PEM RSA/SSH", () => {
    const raw = `
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA04r+y6...fake_private_key_data...
-----END RSA PRIVATE KEY-----
`;
    const cleaned = sanitizeSecrets(raw);
    expect(cleaned).not.toContain("MIIEowIBAAKCAQEA04r+y6");
    expect(cleaned).toContain("[REDACTED_PRIVATE_KEY]");
  });
});
