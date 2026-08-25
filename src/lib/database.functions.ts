import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import * as fs from "fs";
import * as path from "path";

const TABLES_ORDER = [
  "profiles",
  "roles",
  "user_roles",
  "servers",
  "product_groups",
  "products",
  "services",
  "hosting_accounts",
  "vps_instances",
  "invoices",
  "invoice_items",
  "payments",
  "coupons",
  "domains",
  "tickets",
  "ticket_messages",
  "settings",
  "system_settings"
];

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

    const supabaseUrl = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
    const supabaseKey = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    const hasServiceRole = Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]);

    // Buscar usuários do banco
    const { data: users, error: usersError } = await context.supabase
      .from("profiles")
      .select("id, full_name, email, status, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (usersError) {
      console.warn("[getDatabaseInfo] Users error:", usersError.message);
    }

    return {
      config: {
        url: supabaseUrl,
        publishableKey: supabaseKey ? `${supabaseKey.slice(0, 16)}...` : "Não configurada",
        hasServiceRole,
      },
      users: users || [],
    };
  });

export const listServerBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Unauthorized");

    const backupsDir = path.resolve(process.cwd(), "backups");
    if (!fs.existsSync(backupsDir)) {
      return [];
    }

    const entries = fs.readdirSync(backupsDir, { withFileTypes: true });
    const backups = [];

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith("backup-")) {
        const folderPath = path.join(backupsDir, entry.name);
        const summaryPath = path.join(folderPath, "_summary.json");
        let summary: any = null;
        let totalFiles = 0;

        try {
          const files = fs.readdirSync(folderPath);
          totalFiles = files.filter(f => f.endsWith(".json") && f !== "_summary.json").length;
          if (fs.existsSync(summaryPath)) {
            summary = JSON.parse(fs.readFileSync(summaryPath, "utf-8"));
          }
        } catch {
          // ignore
        }

        const stat = fs.statSync(folderPath);

        backups.push({
          folderName: entry.name,
          createdAt: summary?.timestamp || stat.mtime.toISOString(),
          totalRecords: summary?.totalRecords ?? 0,
          totalFiles,
          tables: summary?.tables || {},
        });
      }
    }

    return backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

export const triggerDatabaseBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Unauthorized");

    const { runBackup } = await import("../../scripts/backup-database.mjs");
    const resultDir = await runBackup();
    return { success: true, folder: path.basename(resultDir) };
  });

export const exportDatabase = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Unauthorized");

    const tables = [
      "profiles",
      "user_roles",
      "servers",
      "product_groups",
      "products",
      "product_prices",
      "services",
      "vps_instances",
      "orders",
      "invoices",
      "invoice_items",
      "transactions",
      "wallet_transactions",
      "coupons",
      "domains",
      "tickets",
      "ticket_messages",
      "system_settings",
      "audit_logs",
      "email_logs",
      "whmcs_imports"
    ];
    const backup: Record<string, any> = {};

    for (const table of tables) {
      try {
        const { data, error } = await context.supabase.from(table as any).select("*");
        if (!error && data) {
          backup[table] = data;
        }
      } catch {
        // ignore
      }
    }

    return {
      timestamp: new Date().toISOString(),
      generator: "Hosting Hub Pro",
      tablesCount: Object.keys(backup).length,
      data: backup
    };
  });

export const importDatabaseBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({
      backupData: z.record(z.any()),
      tablesToRestore: z.array(z.string()).optional(),
    }).parse(data)
  )
  .handler(async ({ data: input, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });

    if (!isAdmin) throw new Error("Unauthorized");

    const payload = input.backupData.data || input.backupData;
    const availableTables = Object.keys(payload);
    const tablesToRun = input.tablesToRestore && input.tablesToRestore.length > 0
      ? input.tablesToRestore
      : TABLES_ORDER.filter(t => availableTables.includes(t));

    const results: Record<string, { inserted: number; errors: string[] }> = {};

    for (const table of tablesToRun) {
      const records = payload[table];
      if (!Array.isArray(records) || records.length === 0) continue;

      results[table] = { inserted: 0, errors: [] };

      // Inserir / Upsert em chunks de 50 para evitar sobrecarga
      const CHUNK_SIZE = 50;
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);
        try {
          const { error } = await context.supabase
            .from(table as any)
            .upsert(chunk, { ignoreDuplicates: false });

          if (error) {
            results[table].errors.push(error.message);
          } else {
            results[table].inserted += chunk.length;
          }
        } catch (e: any) {
          results[table].errors.push(e.message);
        }
      }
    }

    return {
      success: true,
      summary: results,
    };
  });
