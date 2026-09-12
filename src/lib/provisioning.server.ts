import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

export async function getClientProvisioningAudit(
  supabase: SupabaseClient<Database>,
  userId: string,
  clientId: string
) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  if (!isAdmin) throw new Error("Unauthorized");

  const { data: logs, error } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, description, metadata, created_at, user_id")
    .eq("user_id", clientId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return [];
  return (logs || []).map((l: any) => ({
    id: l.id,
    service_id: l.entity_id,
    user_id: l.user_id,
    action: l.action,
    status: l.metadata?.status || (l.action.includes("failed") ? "failed" : "success"),
    message: l.description,
    created_at: l.created_at,
    services: {
      domain: l.metadata?.domain || "Serviço",
      products: { name: l.metadata?.productName || "Hospedagem" }
    }
  }));
}
