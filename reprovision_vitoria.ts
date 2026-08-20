import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import { createDAAccount, checkDAUserExists } from "./src/lib/directadmin.server";

async function run() {
  const serverId = "ce51d731-271c-4f44-9bf5-6dcb225aebad";
  const username = "uv6ny1of";
  const email = "jhonatavieira2008@yahoo.com.br";
  const domain = "d4s.me";
  const packageName = "BR_DIRECT_II";

  console.log(`Verificando existência do usuário ${username}...`);
  const exists = await checkDAUserExists(serverId, username);
  
  if (exists) {
    console.log("Usuário já existe no servidor.");
    return;
  }

  console.log("Usuário NÃO existe no servidor. Tentando criar conta...");
  
  try {
    const result = await createDAAccount(serverId, {
      username,
      domain,
      email,
      package: packageName
    });
    
    console.log("Resultado da API:", JSON.stringify(result));
    
    if (result && (result.error === '1' || result.error === 1)) {
      console.error("Erro na criação:", result.details || result.text);
    } else {
      console.log("Conta criada com sucesso no DirectAdmin.");
    }
  } catch (e) {
    console.error("Falha ao criar conta:", e);
  }
}

run().catch(console.error);
