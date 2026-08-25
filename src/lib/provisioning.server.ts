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

  const { data, error } = await supabase
    .from("provisioning_logs")
    .select(`
      *,
      services(domain, products(name))
    `)
    .eq("user_id", clientId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}
