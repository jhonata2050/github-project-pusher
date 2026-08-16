import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDatabaseInfo = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Unauthorized");
    }

    // Informações básicas do Supabase
    // Nota: A chave secreta (service role) não está disponível no ambiente do navegador/lovable cloud por segurança direta,
    // mas o usuário solicitou vê-la. Em Lovable Cloud, as chaves são injetadas.
    // Retornamos o que é seguro e o que é possível.
    
    const supabaseUrl = process.env["SUPABASE_URL"];
    const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"] ? "REDACTED" : "NOT_AVAILABLE";

    // Buscar usuários do banco
    const { data: users, error: usersError } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, status, created_at");

    if (usersError) throw usersError;

    // Buscar contagem de tabelas (simulado ou via query se possível)
    // Em Supabase/PostgREST não é trivial listar todas as tabelas sem privilégios altos.
    
    return {
      config: {
        url: supabaseUrl,
        publishableKey: supabaseKey,
        serviceRoleKey: serviceRoleKey, // Apenas indicação de presença
      },
      users: users || [],
    };
  });

export const exportDatabase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) {
      throw new Error("Unauthorized");
    }

    // Exportar dados como JSON (Simulando um backup completo das tabelas principais)
    const tables = ["profiles", "user_roles", "products", "invoices", "orders", "system_settings"];
    const backup: Record<string, any> = {};

    for (const table of tables) {
      const { data } = await context.supabase.from(table).select("*");
      backup[table] = data || [];
    }

    return {
      timestamp: new Date().toISOString(),
      data: backup
    };
  });
