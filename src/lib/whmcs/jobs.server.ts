import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { type ImportStats, emptyStats } from "./types";
import { importClients } from "./clients.server";
import { importServices } from "./services.server";
import { importInvoices } from "./invoices.server";

export async function startImportJob(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("whmcs_imports")
    .insert({ status: "running" })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function importBatch(
  kind: "clients" | "services" | "invoices",
  rows: Record<string, string>[],
): Promise<ImportStats> {
  const stats = emptyStats();
  if (kind === "clients") await importClients(rows, stats);
  else if (kind === "services") await importServices(rows, stats);
  else await importInvoices(rows, stats);
  return stats;
}

export async function finishImportJob(
  jobId: string,
  stats: ImportStats,
  errorMessage?: string,
): Promise<void> {
  await supabaseAdmin
    .from("whmcs_imports")
    .update({
      status: errorMessage ? "failed" : "completed",
      summary: {
        ...stats,
        error_message: errorMessage ?? null,
      } as any,
    })
    .eq("id", jobId);
}
