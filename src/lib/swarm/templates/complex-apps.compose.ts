import type { TemplateContext } from "./types";

export function buildTypebotCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, wildcard, getEnv, limits } = ctx;
  const tbDbPass = getEnv("POSTGRES_PASSWORD");
  const tbSecret = getEnv("ENCRYPTION_SECRET");

  return `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_tb_db:
    driver: local
services:
  db:
    image: postgres:16-alpine
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_tb_db:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: "typebot"
      POSTGRES_USER: "typebot"
      POSTGRES_PASSWORD: "${tbDbPass}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.tbDbCpu}"
          memory: ${limits.tbDbMem}
  builder:
    image: baptistearno/typebot-builder:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      DATABASE_URL: "postgresql://typebot:${tbDbPass}@db:5432/typebot"
      NEXTAUTH_URL: "https://${cleanHost}"
      NEXT_PUBLIC_VIEWER_URL: "https://viewer-${cleanId}.${wildcard}"
      ENCRYPTION_SECRET: "${tbSecret}"
      PORT: "3000"
      DISABLE_SIGNUP: "false"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.tbBuilderCpu}"
          memory: ${limits.tbBuilderMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_builder-http.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_builder-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_builder-http.service=${stackName}_builder"
        - "traefik.http.routers.${stackName}_builder-https.rule=Host(\`${cleanHost}\`)"
        - "traefik.http.routers.${stackName}_builder-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_builder-https.tls=true"
        - "traefik.http.routers.${stackName}_builder-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_builder-https.service=${stackName}_builder"
        - "traefik.http.services.${stackName}_builder.loadbalancer.server.port=3000"
  viewer:
    image: baptistearno/typebot-viewer:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      DATABASE_URL: "postgresql://typebot:${tbDbPass}@db:5432/typebot"
      NEXTAUTH_URL: "https://viewer-${cleanId}.${wildcard}"
      ENCRYPTION_SECRET: "${tbSecret}"
      PORT: "3000"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.tbViewerCpu}"
          memory: ${limits.tbViewerMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_viewer-http.rule=Host(\`viewer-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_viewer-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_viewer-http.service=${stackName}_viewer"
        - "traefik.http.routers.${stackName}_viewer-https.rule=Host(\`viewer-${cleanId}.${wildcard}\`)"
        - "traefik.http.routers.${stackName}_viewer-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_viewer-https.tls=true"
        - "traefik.http.routers.${stackName}_viewer-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_viewer-https.service=${stackName}_viewer"
        - "traefik.http.services.${stackName}_viewer.loadbalancer.server.port=3000"
`;
}

export function buildOpenStatusCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, server, getEnv, limits } = ctx;
  const adminHost = `admin-openstatus-${cleanId}.${server.wildcardDomain || "dk1.eqsam.com"}`;
  const resendApiKey = getEnv("RESEND_API_KEY", "re_insira_sua_chave_resend_aqui");
  const nextAuthSecret = getEnv("NEXTAUTH_SECRET");
  const authSecret = getEnv("AUTH_SECRET", nextAuthSecret);
  const cronSecret = getEnv("CRON_SECRET");
  const dbUrl = getEnv("DATABASE_URL", "http://db:8080");
  const tursoDbUrl = getEnv("TURSO_DATABASE_URL", dbUrl);
  const nextAuthUrl = getEnv("NEXTAUTH_URL", `https://${adminHost}`);
  const nextPublicUrl = getEnv("NEXT_PUBLIC_URL", `https://${adminHost}`);
  const nodeEnv = getEnv("NODE_ENV", "production");
  const port = getEnv("PORT", "3000");
  const hostname = getEnv("HOSTNAME", "0.0.0.0");
  const nodeOptions = getEnv("NODE_OPTIONS", "--max-old-space-size=512");
  const authTrustHost = getEnv("AUTH_TRUST_HOST", "true");
  const skipEnvValidation = getEnv("SKIP_ENV_VALIDATION", "true");
  const selfHost = getEnv("SELF_HOST", "true");
  const projIdVercel = getEnv("PROJECT_ID_VERCEL", "dummy");
  const teamIdVercel = getEnv("TEAM_ID_VERCEL", "dummy");
  const vercelAuthBearer = getEnv("VERCEL_AUTH_BEARER_TOKEN", "dummy");
  const stripeSecretKey = getEnv("STRIPE_SECRET_KEY", "dummy");
  const tinyBirdApiKey = getEnv("TINY_BIRD_API_KEY", "dummy");
  const unkeyApiId = getEnv("UNKEY_API_ID", "dummy");
  const unkeyToken = getEnv("UNKEY_TOKEN", "dummy");

  return `version: '3.8'
networks:
  net_${cleanId}:
    driver: overlay
    attachable: true
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_sqld:
    driver: local
  vol_${cleanId}_data:
    driver: local
services:
  db:
    image: ghcr.io/tursodatabase/libsql-server:latest
    networks:
      - net_${cleanId}
    volumes:
      - vol_${cleanId}_sqld:/var/lib/sqld
    environment:
      SQLD_NODE: "primary"
      SQLD_HTTP_LISTEN_ADDR: "0.0.0.0:8080"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.osDbCpu}"
          memory: ${limits.osDbMem}
  app:
    image: ghcr.io/openstatushq/openstatus-status-page:latest
    networks:
      - net_${cleanId}
      - public-ingress
    volumes:
      - vol_${cleanId}_data:/app/data
    environment:
      PORT: "${port}"
      HOSTNAME: "${hostname}"
      NODE_ENV: "${nodeEnv}"
      NODE_OPTIONS: "${nodeOptions}"
      AUTH_TRUST_HOST: "${authTrustHost}"
      SKIP_ENV_VALIDATION: "${skipEnvValidation}"
      DATABASE_URL: "${dbUrl}"
      TURSO_DATABASE_URL: "${tursoDbUrl}"
      AUTH_SECRET: "${authSecret}"
      CRON_SECRET: "${cronSecret}"
      PROJECT_ID_VERCEL: "${projIdVercel}"
      TEAM_ID_VERCEL: "${teamIdVercel}"
      VERCEL_AUTH_BEARER_TOKEN: "${vercelAuthBearer}"
      RESEND_API_KEY: "${resendApiKey}"
      STRIPE_SECRET_KEY: "${stripeSecretKey}"
      TINY_BIRD_API_KEY: "${tinyBirdApiKey}"
      UNKEY_API_ID: "${unkeyApiId}"
      UNKEY_TOKEN: "${unkeyToken}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.osAppCpu}"
          memory: ${limits.osAppMem}
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
  dashboard:
    image: ghcr.io/openstatushq/openstatus-dashboard:latest
    networks:
      - net_${cleanId}
      - public-ingress
    environment:
      PORT: "${port}"
      HOSTNAME: "${hostname}"
      NODE_ENV: "${nodeEnv}"
      NODE_OPTIONS: "${nodeOptions}"
      SELF_HOST: "${selfHost}"
      AUTH_TRUST_HOST: "${authTrustHost}"
      SKIP_ENV_VALIDATION: "${skipEnvValidation}"
      DATABASE_URL: "${dbUrl}"
      TURSO_DATABASE_URL: "${tursoDbUrl}"
      AUTH_SECRET: "${authSecret}"
      NEXTAUTH_SECRET: "${nextAuthSecret}"
      NEXTAUTH_URL: "${nextAuthUrl}"
      NEXT_PUBLIC_URL: "${nextPublicUrl}"
      RESEND_API_KEY: "${resendApiKey}"
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
      resources:
        limits:
          cpus: "${limits.osDashCpu}"
          memory: ${limits.osDashMem}
      labels:
        - "traefik.enable=true"
        - "traefik.swarm.network=public-ingress"
        - "traefik.http.routers.${stackName}_dash-http.rule=Host(\`${adminHost}\`)"
        - "traefik.http.routers.${stackName}_dash-http.entrypoints=web"
        - "traefik.http.routers.${stackName}_dash-http.service=${stackName}_dash"
        - "traefik.http.routers.${stackName}_dash-https.rule=Host(\`${adminHost}\`)"
        - "traefik.http.routers.${stackName}_dash-https.entrypoints=websecure"
        - "traefik.http.routers.${stackName}_dash-https.tls=true"
        - "traefik.http.routers.${stackName}_dash-https.tls.certresolver=le"
        - "traefik.http.routers.${stackName}_dash-https.service=${stackName}_dash"
        - "traefik.http.services.${stackName}_dash.loadbalancer.server.port=3000"
`;
}

export function buildEvolutionCompose(ctx: TemplateContext): string {
  const { cleanId, stackName, cleanHost, getEnv, limits } = ctx;
  const evoApiKey = getEnv("AUTHENTICATION_API_KEY");

  return `version: '3.8'
networks:
  public-ingress:
    external: true
volumes:
  vol_${cleanId}_evo:
    driver: local
services:
  app:
    image: evoapicloud/evolution-api:v2.2.3
    networks:
      - public-ingress
    volumes:
      - vol_${cleanId}_evo:/evolution/instances
    environment:
      SERVER_PORT: "8080"
      SERVER_URL: "https://${cleanHost}"
      AUTHENTICATION_API_KEY: "${evoApiKey}"
      DATABASE_ENABLED: "false"
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
