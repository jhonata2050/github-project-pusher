import type { TemplateContext } from "./types";
import {
  buildWordPressCompose,
  buildN8NCompose,
  buildKumaCompose,
  buildGhostCompose,
} from "./web-apps.compose";
import {
  buildPostgresCompose,
  buildMySQLCompose,
  buildRedisCompose,
  buildPocketbaseCompose,
} from "./databases.compose";
import {
  buildPhpCompose,
  buildNodeApiCompose,
  buildPythonCompose,
  buildGoCompose,
  buildJavaCompose,
  buildRustCompose,
  buildDiscordCompose,
  buildNextJsCompose,
  buildStaticCaddyCompose,
} from "./runtimes.compose";
import {
  buildEvolutionCompose,
} from "./complex-apps.compose";

export async function buildTemplateComposeYaml(
  conn: any,
  ctx: TemplateContext
): Promise<string> {
  const { templateId } = ctx;

  if (templateId.includes("wordpress")) {
    return buildWordPressCompose(ctx);
  }
  if (templateId.includes("n8n")) {
    return buildN8NCompose(ctx);
  }
  if (templateId.includes("kuma")) {
    return buildKumaCompose(ctx);
  }
  if (templateId.includes("evolution") || templateId.includes("whatsapp")) {
    return buildEvolutionCompose(ctx);
  }
  if (templateId.includes("ghost")) {
    return buildGhostCompose(ctx);
  }
  if (templateId.includes("pocketbase")) {
    return buildPocketbaseCompose(ctx);
  }
  if (templateId.includes("php") || templateId.includes("laravel")) {
    return buildPhpCompose(ctx);
  }
  if (templateId.includes("postgres")) {
    return buildPostgresCompose(ctx);
  }
  if (templateId.includes("mysql")) {
    return buildMySQLCompose(ctx);
  }
  if (templateId.includes("redis")) {
    return buildRedisCompose(ctx);
  }
  if (templateId.includes("discord")) {
    return buildDiscordCompose(ctx);
  }
  if (templateId.includes("fastify") || templateId.includes("express")) {
    return buildNodeApiCompose(ctx);
  }
  if (templateId.includes("python") || templateId.includes("fastapi") || templateId.includes("flask") || templateId.includes("django")) {
    return buildPythonCompose(ctx);
  }
  if (templateId.includes("go") || templateId.includes("fiber") || templateId.includes("gin")) {
    return buildGoCompose(ctx);
  }
  if (templateId.includes("java") || templateId.includes("spring")) {
    return buildJavaCompose(ctx);
  }
  if (templateId.includes("rust") || templateId.includes("actix")) {
    return buildRustCompose(ctx);
  }
  if (templateId.includes("nextjs") || templateId.includes("next")) {
    return buildNextJsCompose(ctx);
  }

  // Fallback: Static / Caddy HTTP/3
  return buildStaticCaddyCompose(conn, ctx);
}
