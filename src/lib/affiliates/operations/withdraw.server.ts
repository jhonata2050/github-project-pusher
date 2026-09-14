import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAffiliatesStore, saveAffiliatesStore } from "../store.server";

/**
 * Resgatar saldo de comissão para a carteira
 */
export async function withdrawAffiliateToWallet(userId: string, amount: number) {
  const cleanAmount = Number(Number(amount).toFixed(2));
  if (isNaN(cleanAmount) || cleanAmount <= 0) {
    throw new Error("Valor de resgate inválido.");
  }

  const store = await getAffiliatesStore();
  const aff = store[userId];
  if (!aff) throw new Error("Conta de afiliado não encontrada.");

  const currentAvailable = Number(aff.available_balance || 0);
  if (currentAvailable < cleanAmount) {
    throw new Error(
      `Saldo insuficiente. Você tem R$ ${currentAvailable.toFixed(2)} disponíveis para resgate.`
    );
  }

  const newAffBalance = Number((currentAvailable - cleanAmount).toFixed(2));
  const newPaidEarnings = Number((Number(aff.paid_earnings || 0) + cleanAmount).toFixed(2));

  aff.available_balance = newAffBalance;
  aff.paid_earnings = newPaidEarnings;
  aff.updated_at = new Date().toISOString();
  store[userId] = aff;
  await saveAffiliatesStore(store);

  // Creditar na carteira do cliente
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("account_balance, full_name, phone")
    .eq("id", userId)
    .single();

  const currentWallet = Number(profile?.account_balance || 0);
  const newWallet = Number((currentWallet + cleanAmount).toFixed(2));

  await supabaseAdmin
    .from("profiles")
    .update({
      account_balance: newWallet,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  return {
    success: true,
    transferredAmount: cleanAmount,
    newAffiliateBalance: newAffBalance,
    newWalletBalance: newWallet,
  };
}
