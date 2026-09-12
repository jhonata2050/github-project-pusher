import { resolveDeploymentRuntime, type DeploymentRuntime } from "../../templates.data";
import { generateCaddyfileForRuntime } from "../swarm-routing.server";
import { execSshCommand } from "../swarm-transport.server";
import { Buffer } from "buffer";
import type { TemplateContext } from "./types";

export function buildPhpCompose(ctx: TemplateContext): string {
  const { stackName, cleanHost, stackDir, app, limits } = ctx;
  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: php:8.3-apache
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/var/www/html
    environment:
      APP_NAME: "${app.name}"
      APP_ENV: "production"
    command: >
      sh -c "a2enmod rewrite 2>/dev/null || true;
      if [ -d /var/www/html/public ]; then
        sed -ri -e 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/*.conf /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf 2>/dev/null || true;
      fi;
      apache2-foreground"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=80"
`;
}

export function buildNodeApiCompose(ctx: TemplateContext): string {
  const { stackName, cleanHost, stackDir, app, limits } = ctx;
  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: node:20-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "3000"
      HOST: "0.0.0.0"
      APP_NAME: "${app.name}"
      NODE_ENV: "production"
    command: sh -c "if [ -f package.json ]; then npm install --production && npm start; elif [ -f index.js ]; then node index.js; else sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
`;
}

export function buildPythonCompose(ctx: TemplateContext): string {
  const { stackName, cleanHost, stackDir, templateId, app, limits } = ctx;
  const isFastApi = templateId.includes("fastapi");
  const appPort = isFastApi ? 8000 : 5000;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: python:3.11-slim
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "${appPort}"
      APP_NAME: "${app.name}"
      PYTHONUNBUFFERED: "1"
    command: sh -c "if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi; if [ -f main.py ]; then python3 main.py; elif [ -f app.py ]; then python3 app.py; else python3 -m http.server ${appPort}; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=${appPort}"
`;
}

export function buildGoCompose(ctx: TemplateContext): string {
  const { stackName, cleanHost, stackDir, app, limits } = ctx;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: golang:1.22-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "3000"
      APP_NAME: "${app.name}"
    command: sh -c "if [ ! -f go.mod ]; then go mod init app; fi; go run main.go"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
`;
}

export function buildJavaCompose(ctx: TemplateContext): string {
  const { stackName, cleanHost, stackDir, app, limits } = ctx;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: eclipse-temurin:21-jdk-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "8080"
      APP_NAME: "${app.name}"
    command: sh -c "if [ -f pom.xml ]; then ./mvnw -DskipTests spring-boot:run || mvn spring-boot:run; elif [ -f *.jar ]; then java -jar *.jar; elif [ -f Main.java ]; then javac Main.java && java Main; else java -version && sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=8080"
`;
}

export function buildRustCompose(ctx: TemplateContext): string {
  const { stackName, cleanHost, stackDir, app, limits } = ctx;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: rust:1.80-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "8080"
      APP_NAME: "${app.name}"
    command: sh -c "if [ -f Cargo.toml ]; then cargo run --release; elif [ -f src/main.rs ]; then rustc src/main.rs && ./main; else sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=8080"
`;
}

export function buildDiscordCompose(ctx: TemplateContext): string {
  const { stackName, cleanHost, stackDir, app, limits } = ctx;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: node:20-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "3000"
      APP_NAME: "${app.name}"
      NODE_ENV: "production"
    command: sh -c "if [ -f package.json ]; then npm install --production && npm start; elif [ -f index.js ]; then node index.js; else sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
`;
}

export function buildNextJsCompose(ctx: TemplateContext): string {
  const { stackName, cleanHost, stackDir, app, limits } = ctx;

  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  app:
    image: node:20-alpine
    working_dir: /app
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/app
    environment:
      PORT: "3000"
      HOST: "0.0.0.0"
      APP_NAME: "${app.name}"
      NODE_ENV: "production"
    command: sh -c "if [ -f package.json ]; then npm install && npm run build && npm start; elif [ -f index.js ]; then node index.js; else sleep 3600; fi"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_app-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_app-http.service=${stackName}_app"
        - "traefik.http.routers.${stackName}_app-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_app-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_app-https.tls=true"
        - "traefik.http.routers.${stackName}_app-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_app-https.service=${stackName}_app"
        - "traefik.http.services.${stackName}_app.loadbalancer.server.port=3000"
`;
}

export async function buildStaticCaddyCompose(conn: any, ctx: TemplateContext): Promise<string> {
  const { stackName, cleanHost, stackDir, templateId, template, app, limits } = ctx;
  const runtimeToUse: DeploymentRuntime =
    template.runtime ||
    resolveDeploymentRuntime(templateId, template.build_pack || app.build_pack);

  const caddyfileConfig = generateCaddyfileForRuntime(runtimeToUse, {
    rootDir: "/usr/share/caddy",
    port: template.default_port || 80,
    hasAppService: false,
  });
  const b64Caddyfile = Buffer.from(caddyfileConfig).toString("base64");
  await execSshCommand(conn, `echo "${b64Caddyfile}" | base64 -d > ${stackDir}/Caddyfile`);

  return `version: '3.8'
networks:
  public-ingress:
    external: true
services:
  web:
    image: caddy:alpine
    networks:
      - public-ingress
    volumes:
      - ${stackDir}/html:/usr/share/caddy
      - ${stackDir}/Caddyfile:/etc/caddy/Caddyfile:ro
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.cpuLimit}"
          memory: ${limits.memLimit}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_web-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_web-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_web-http.service=${stackName}_web"
        - "traefik.http.routers.${stackName}_web-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_web-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_web-https.tls=true"
        - "traefik.http.routers.${stackName}_web-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_web-https.service=${stackName}_web"
        - "traefik.http.services.${stackName}_web.loadbalancer.server.port=80"
`;
}
