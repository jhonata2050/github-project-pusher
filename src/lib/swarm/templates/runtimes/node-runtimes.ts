import type { TemplateContext } from "../types";

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
