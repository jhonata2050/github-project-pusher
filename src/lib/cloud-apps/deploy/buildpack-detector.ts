import fsSync from "node:fs";
import path from "node:path";
import type { ActiveDeploymentRecord } from "../types";

export interface DetectedBuildpack {
  detectedBuildPack: "nixpacks" | "dockerfile" | "dockercompose" | "static";
  defaultPort: number;
  templateId: string;
}

/**
 * Analisa os arquivos em disco de um projeto Git para detectar a arquitetura,
 * framework e buildpack necessários para execução no cluster.
 */
export function detectProjectBuildpack(
  clientRoot: string,
  cleanRepoUrl: string,
  deploymentRecord?: ActiveDeploymentRecord
): DetectedBuildpack {
  let detectedBuildPack: "nixpacks" | "dockerfile" | "dockercompose" | "static" = "nixpacks";
  let defaultPort = 3000;
  let templateId = "git-custom";

  const hasDockerfile = fsSync.existsSync(path.join(clientRoot, "Dockerfile"));
  const hasCompose =
    fsSync.existsSync(path.join(clientRoot, "docker-compose.yml")) ||
    fsSync.existsSync(path.join(clientRoot, "compose.yml"));
  const hasPackageJson = fsSync.existsSync(path.join(clientRoot, "package.json"));
  const hasPython =
    fsSync.existsSync(path.join(clientRoot, "requirements.txt")) ||
    fsSync.existsSync(path.join(clientRoot, "pyproject.toml"));

  if (hasDockerfile) {
    detectedBuildPack = "dockerfile";
    templateId = "docker-custom";
    deploymentRecord?.logs.push({
      output: `Dockerfile detectado na raiz do projeto. Compilação via Docker Engine ativada.`,
      type: "stdout",
    });
  } else if (hasCompose) {
    detectedBuildPack = "dockercompose";
    templateId = "docker-compose-custom";
    deploymentRecord?.logs.push({
      output: `docker-compose.yml detectado. Orquestração multi-container ativada.`,
      type: "stdout",
    });
  } else if (hasPackageJson) {
    detectedBuildPack = "nixpacks";
    try {
      const pkgContent = fsSync.readFileSync(path.join(clientRoot, "package.json"), "utf-8");
      const pkg = JSON.parse(pkgContent);
      if (pkg.dependencies?.next || pkg.devDependencies?.next) {
        defaultPort = 3000;
        deploymentRecord?.logs.push({ output: `Framework detectado: Next.js (Porta 3000)`, type: "stdout" });
      } else {
        defaultPort = 3000;
        deploymentRecord?.logs.push({ output: `Ambiente detectado: Node.js (Porta 3000)`, type: "stdout" });
      }
    } catch {}
  } else if (hasPython) {
    detectedBuildPack = "nixpacks";
    defaultPort = 8000;
    deploymentRecord?.logs.push({ output: `Ambiente detectado: Python (Porta 8000)`, type: "stdout" });
  } else if (fsSync.existsSync(path.join(clientRoot, "index.html"))) {
    detectedBuildPack = "static";
    defaultPort = 80;
    deploymentRecord?.logs.push({ output: `Website estático detectado (HTML/CSS/JS • Caddy Server)`, type: "stdout" });
  }

  return { detectedBuildPack, defaultPort, templateId };
}
