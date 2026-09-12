import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

/**
 * Leitor recursivo de todos os arquivos de código sob src/
 */
function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllSourceFiles(fullPath, fileList);
    } else if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

describe("Integridade Estrita de Schema do Banco de Dados (Anti-Erro 42703)", () => {
  const srcDir = path.resolve(process.cwd(), "src");
  const sourceFiles = getAllSourceFiles(srcDir);

  it("garante que nenhum arquivo em src/ tenta fazer insert ou update com 'error_message' na tabela 'services'", () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      // Se menciona 'services' e 'error_message'
      if ((content.includes('"services"') || content.includes("'services'")) && content.includes("error_message")) {
        const lines = content.split("\n");
        let insideServicesBlock = false;
        let blockBracketCount = 0;

        lines.forEach((line, index) => {
          if (line.includes('.from("services")') || line.includes(".from('services')")) {
            insideServicesBlock = true;
            blockBracketCount = 0;
          }
          if (insideServicesBlock) {
            if (line.includes("{")) blockBracketCount += (line.match(/{/g) || []).length;
            if (line.includes("}")) blockBracketCount -= (line.match(/}/g) || []).length;

            if (line.includes("error_message:") && (line.includes("update") || blockBracketCount > 0)) {
              violations.push({
                file: path.relative(process.cwd(), filePath),
                line: index + 1,
                text: line.trim(),
              });
            }

            if (line.includes(";") || (blockBracketCount <= 0 && line.includes(")."))) {
              insideServicesBlock = false;
            }
          }
        });
      }
    }

    expect(
      violations,
      `Colunas fantasmas 'services.error_message' detectadas em queries: ${JSON.stringify(violations, null, 2)}`
    ).toHaveLength(0);
  });

  it("garante que nenhum arquivo em src/ tenta acessar ou atualizar 'servers.can_backup'", () => {
    const violations: { file: string; match: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes("can_backup") && (content.includes('.from("servers")') || content.includes(".from('servers')"))) {
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if (line.includes("can_backup") && !line.trim().startsWith("//")) {
            violations.push({ file: path.relative(process.cwd(), filePath), match: `Linha ${index + 1}: ${line.trim()}` });
          }
        });
      }
    }

    expect(violations, `Colunas fantasmas 'servers.can_backup' detectadas em: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });

  it("garante que inserções em vps_instances utilizam apenas colunas reais do schema", () => {
    const violations: { file: string; match: string }[] = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes('.from("vps_instances")') || content.includes(".from('vps_instances')")) {
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if ((line.includes("billing_cycle:") || line.includes("plan_price:")) && line.includes("vpsPayload")) {
            violations.push({ file: path.relative(process.cwd(), filePath), match: `Linha ${index + 1}: ${line.trim()}` });
          }
        });
      }
    }
    expect(violations).toHaveLength(0);
  });

  it("garante que nenhum arquivo em src/ tenta acessar 'servers.server_type' (deve ser 'servers.type')", () => {
    const violations: { file: string; match: string }[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes("server_type") && (content.includes('.from("servers")') || content.includes(".from('servers')"))) {
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if (line.includes("server_type") && !line.trim().startsWith("//")) {
            violations.push({ file: path.relative(process.cwd(), filePath), match: `Linha ${index + 1}: ${line.trim()}` });
          }
        });
      }
    }
    expect(violations, `Coluna fantasma 'servers.server_type' detectada em: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });

  it("garante que nenhum arquivo em src/ tenta acessar 'vps_instances.service_id' (deve ser 'vps_instances.user_id')", () => {
    const violations: { file: string; match: string }[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes('.from("vps_instances")') || content.includes(".from('vps_instances')")) {
        const lines = content.split("\n");
        let inVpsQuery = false;
        lines.forEach((line, index) => {
          if (line.includes('.from("vps_instances")') || line.includes(".from('vps_instances')")) {
            inVpsQuery = true;
          }
          if (inVpsQuery && line.includes("service_id") && !line.trim().startsWith("//")) {
            violations.push({ file: path.relative(process.cwd(), filePath), match: `Linha ${index + 1}: ${line.trim()}` });
          }
          if (line.includes(";")) {
            inVpsQuery = false;
          }
        });
      }
    }
    expect(violations, `Coluna fantasma 'vps_instances.service_id' detectada em: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });

  it("garante que nenhum arquivo em src/ tenta selecionar 'category' diretamente em 'audit_logs'", () => {
    const violations: { file: string; match: string }[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes("category") && (content.includes('.from("audit_logs")') || content.includes(".from('audit_logs')"))) {
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if (line.includes(".select(") && line.includes("category") && !line.trim().startsWith("//")) {
            violations.push({ file: path.relative(process.cwd(), filePath), match: `Linha ${index + 1}: ${line.trim()}` });
          }
        });
      }
    }
    expect(violations, `Coluna fantasma 'audit_logs.category' detectada em: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });

  it("garante que nenhum arquivo em src/ faz consultas diretas na tabela inexistente 'notifications'", () => {
    const violations: { file: string; match: string }[] = [];
    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (content.includes('.from("notifications")') || content.includes(".from('notifications')")) {
        const lines = content.split("\n");
        lines.forEach((line, index) => {
          if ((line.includes('.from("notifications")') || line.includes(".from('notifications')")) && !line.trim().startsWith("//")) {
            violations.push({ file: path.relative(process.cwd(), filePath), match: `Linha ${index + 1}: ${line.trim()}` });
          }
        });
      }
    }
    expect(violations, `Tabela inexistente 'notifications' consultada em: ${JSON.stringify(violations, null, 2)}`).toHaveLength(0);
  });
});
