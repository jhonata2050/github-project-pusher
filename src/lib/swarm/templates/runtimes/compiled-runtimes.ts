import type { TemplateContext } from "../types";

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
