export function getAppStackLabel(app: any): string {
  const name = (app?.name || "").toLowerCase();
  if (name.includes("wordpress")) return "WordPress + PHP";
  if (name.includes("ghost")) return "Ghost CMS";
  if (name.includes("kuma") || name.includes("uptime") || name.includes("monitoramento")) return "Uptime Kuma";
  if (name.includes("evolution") || name.includes("whatsapp")) return "Evolution API";
  if (name.includes("n8n")) return "N8N Automations";
  if (name.includes("mysql") || name.includes("mariadb")) return "MySQL 8.4";
  if (app?.build_pack && app.build_pack !== "container") return String(app.build_pack).toUpperCase();
  return "Docker Container";
}
