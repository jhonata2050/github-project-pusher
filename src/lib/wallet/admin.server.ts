import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { autoPayPendingInvoices } from "./payment.server";

/**
 * Ajuste Manual de Saldo pelo Administrador
 */
export async function adminAdjustBalance(
  adminUserId: string,
  targetUserId: string,
  amount: number,
  type: "deposit" | "refund" | "bonus" | "adjustment",
  description: string
) {
  // Validar se é Admin
  let isAuthorized = false;
  try {
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
      _user_id: adminUserId,
      _role: "admin",
    });
    if (isAdmin) isAuthorized = true;
  } catch (e) {}

  if (!isAuthorized) {
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", adminUserId)
      .in("role", ["admin", "staff"])
      .maybeSingle();
    if (roleRow) isAuthorized = true;
  }

  if (!isAuthorized) throw new Error("Acesso negado: Apenas administradores podem ajustar saldo.");

  const { data: profile, error: pError } = await supabaseAdmin
    .from("profiles")
    .select("account_balance, full_name, phone")
    .eq("id", targetUserId)
    .single();

  if (pError || !profile) throw new Error("Cliente não encontrado");

  const currentBalance = Number(profile.account_balance || 0);
  const newBalance = Number(Math.max(0, currentBalance + amount).toFixed(2));

  await supabaseAdmin
    .from("profiles")
    .update({
      account_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId);

  try {
    await supabaseAdmin.from("wallet_transactions").insert({
      user_id: targetUserId,
      type,
      amount,
      balance_after: newBalance,
      description: description || `Ajuste manual de saldo pelo suporte (${type})`,
    });
  } catch (e) {
    // Ignora
  }

  // Se o saldo aumentou, tentar auto-pagar faturas pendentes que estavam aguardando saldo
  if (amount > 0) {
    setTimeout(() => {
      autoPayPendingInvoices(targetUserId).catch(() => {});
    }, 500);
  }

  return {
    success: true,
    previousBalance: currentBalance,
    newBalance,
    difference: amount,
  };
}
