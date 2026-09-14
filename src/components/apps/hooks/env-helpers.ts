export function detectPendingRequiredEnvs(envs?: Array<{ key: string; value: string }>) {
  if (!envs || !Array.isArray(envs)) return [];
  const placeholderTokens = [
    "re_insira_",
    "insira_",
    "seu_",
    "sua_",
    "coloque_",
    "change_me",
    "placeholder",
    "your_",
    "insert_",
    "replace_",
    "eqsam_wp_pass",
    "eqsam-auth-secret",
    "eqsam-cron",
    "eqsam_api_secret",
  ];
  return envs.filter((e) => {
    const val = (e.value || "").trim().toLowerCase();
    if (!val && (e.key.includes("KEY") || e.key.includes("TOKEN") || e.key.includes("SECRET") || e.key.includes("PASSWORD"))) return true;
    return placeholderTokens.some((token) => val.includes(token));
  });
}
