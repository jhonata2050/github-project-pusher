import { getDASession } from "./src/lib/directadmin.server";

async function verify() {
  const serverId = "ce51d731-271c-4f44-9bf5-6dcb225aebad";
  const targetUser = "v6lk8dp";

  console.log(`[TEST] Gerando SSO para ${targetUser}...`);
  try {
    const url = await getDASession(serverId, targetUser);
    console.log(`[TEST] URL Gerada com sucesso.`);
    console.log(`[TEST] URL: ${url.replace(/hash=[^&]+/, 'hash=HIDDEN')}`);
  } catch (e) {
    console.error(`[TEST] Erro ao gerar SSO:`, e.message);
  }
}

verify();
