import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rowSchema = z.record(z.string(), z.string());

const batchSchema = z.object({
  kind: z.enum(["clients", "services", "invoices"]),
  rows: z.array(rowSchema).max(200),
});

const statsSchema = z.object({
  clients: z.object({ created: z.number(), updated: z.number(), failed: z.number() }),
  services: z.object({ created: z.number(), failed: z.number() }),
  invoices: z.object({ created: z.number(), failed: z.number() }),
  errors: z.array(z.string()),
});

const finishSchema = z.object({
  jobId: z.string(),
  stats: statsSchema,
  errorMessage: z.string().optional(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!isAdmin) throw new Error("Unauthorized");
}

export const startWhmcsImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { startImportJob } = await import("./whmcs-import.server");
    return { jobId: await startImportJob() };
  });

export const importWhmcsBatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => batchSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { importBatch } = await import("./whmcs-import.server");
    return importBatch(data.kind, data.rows);
  });

export const finishWhmcsImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => finishSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { finishImportJob } = await import("./whmcs-import.server");
    await finishImportJob(data.jobId, data.stats, data.errorMessage);
    return { ok: true };
  });

export const listWhmcsImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("whmcs_imports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    return data;
  });
