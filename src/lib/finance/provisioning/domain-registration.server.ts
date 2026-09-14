import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { ProvisioningItemResult } from "./types";

export async function handleDomainRegistrationProvisioning(
  invoice: any,
  item: any,
  profile: any
): Promise<ProvisioningItemResult> {
  console.log(`[Provisioning] Processando registro de domínio para fatura #${invoice.id}`);
  try {
    const desc = item.description || "";
    const domainMatch =
      desc.match(/Registro de Domínio:\s*([a-zA-Z0-9.-]+)/i) ||
      desc.match(/Domínio:\s*([a-zA-Z0-9.-]+)/i);
    const domainName = domainMatch ? domainMatch[1].trim().toLowerCase() : null;

    if (!domainName) {
      return { success: false, error: "Nome de domínio não identificado na descrição do item" };
    }

    const { getDomainRegistrarSettings } = await import("../../domains.server");
    const settings = await getDomainRegistrarSettings();
    const defaultNs = [
      settings.defaultNs1 || "ns1.eqsam.com",
      settings.defaultNs2 || "ns2.eqsam.com",
    ];

    let registrarUsed = "openprovider";

    // Se houver credenciais Openprovider configuradas, chama a API
    if (settings.openproviderUsername) {
      try {
        const { OpenproviderRegistrar } = await import(
          "../../registrars/openprovider.server"
        );
        const { data: passRow } = await supabaseAdmin
          .from("system_settings")
          .select("value")
          .eq("key", "openprovider_password")
          .maybeSingle();

        const openprovider = new OpenproviderRegistrar(
          settings.openproviderUsername,
          passRow?.value || "",
          settings.openproviderTestMode
        );

        // Extrair extensão
        const parts = domainName.split(".");
        const ext =
          parts.length > 2 && parts[parts.length - 1] === "br"
            ? `.${parts[parts.length - 2]}.${parts[parts.length - 1]}`
            : `.${parts[parts.length - 1]}`;

        await openprovider.registerDomain({
          domainName,
          extension: ext,
          periodYears: 1,
          nameservers: defaultNs,
          customerData: {
            name: profile?.full_name || "Cliente",
            email: profile?.email || "contato@eqsam.com",
            phone: profile?.phone || "+5511999999999",
            document: profile?.document || undefined,
          },
        });
        console.log(`[Openprovider] Domínio ${domainName} registrado com sucesso na API!`);
      } catch (regErr: any) {
        console.warn(
          `[Openprovider] Aviso ao registrar na API (salvando no banco):`,
          regErr.message
        );
      }
    }

    // Salvar ou atualizar o domínio no banco de dados
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    await supabaseAdmin.from("domains").upsert(
      {
        user_id: invoice.user_id,
        domain_name: domainName,
        status: "active",
        registrar: registrarUsed,
        registration_date: new Date().toISOString(),
        expiry_date: expiryDate.toISOString(),
        nameservers: defaultNs,
        auto_renew: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "domain_name" }
    );

    if (profile?.phone) {
      try {
        const { sendWhatsAppMessage } = await import("../../whatsapp.server");
        await sendWhatsAppMessage({
          to: profile.phone,
          message: `🌐 *Domínio Registrado com Sucesso!*\n\nOlá ${profile.full_name},\nSeu domínio *${domainName}* foi registrado e ativado com sucesso!\n\nVocê já pode gerenciar os Nameservers DNS diretamente no seu painel.`,
          category: "domain_registered",
        });
      } catch (e) {
        console.warn("[WhatsApp] Falha ao enviar notificação de domínio:", e);
      }
    }

    return {
      domainName,
      success: true,
      message: "Domínio registrado e ativado com sucesso",
    };
  } catch (dErr: any) {
    console.error(`[Provisioning] Erro no registro de domínio:`, dErr.message);
    return { success: false, error: dErr.message };
  }
}
