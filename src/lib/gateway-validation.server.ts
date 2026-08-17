import { gatewayById } from "./gateways";

export async function validateGateway(gatewayId: string, credentials: Record<string, string>) {
  const def = gatewayById(gatewayId);
  if (!def) return { success: false, message: "Gateway não encontrado" };

  for (const key of def.required) {
    if (!credentials[key]) {
      return { success: false, message: `O campo ${key} é obrigatório.` };
    }
  }

  try {
    switch (gatewayId) {
      case "abacatepay": {
        const res = await fetch("https://api.abacatepay.com/v1/billing/list", {
          headers: { Authorization: `Bearer ${credentials["abacatepay_api_key"] || ""}` },
        });
        if (!res.ok) throw new Error(`AbacatePay: ${res.statusText}`);
        return { success: true, message: "Conexão com AbacatePay validada com sucesso!" };
      }

      case "stripe": {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${credentials["stripe_secret_key"] || ""}` },
        });
        const json = await res.json();
        if (!res.ok) throw new Error(`Stripe: ${json?.error?.message || res.statusText}`);
        return { success: true, message: "Conexão com Stripe validada com sucesso!" };
      }

      case "mercadopago": {
        const res = await fetch("https://api.mercadopago.com/v1/payment_methods", {
          headers: { Authorization: `Bearer ${credentials["mercadopago_access_token"] || ""}` },
        });
        if (!res.ok) throw new Error(`Mercado Pago: ${res.statusText}`);
        return { success: true, message: "Conexão com Mercado Pago validada com sucesso!" };
      }

      case "woovi": {
        const res = await fetch("https://api.woovi.com/api/openpix/v1/charge?limit=1", {
          headers: { Authorization: credentials["woovi_app_id"] || "" },
        });
        if (!res.ok) throw new Error(`Woovi: ${res.statusText}`);
        return { success: true, message: "Conexão com Woovi/OpenPix validada com sucesso!" };
      }
      
      case "paghiper": {
        const res = await fetch("https://api.paghiper.com/transaction/list/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            apiKey: credentials["paghiper_api_key"],
            token: credentials["paghiper_token"]
          })
        });
        const json = await res.json();
        if (json?.transaction_list?.result === "reject") {
           throw new Error(`PagHiper: ${json.transaction_list.response_message}`);
        }
        return { success: true, message: "Conexão com PagHiper validada com sucesso!" };
      }

      case "cajupay": {
        const baseUrl = (credentials["cajupay_base_url"] || "https://api.cajupay.com.br").replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/oauth/token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${credentials["cajupay_client_id"] || ""}:${credentials["cajupay_client_secret"] || ""}`)}`,
          },
          body: new URLSearchParams({ grant_type: "client_credentials" }),
        });
        if (!res.ok) {
          const detail = (await res.text().catch(() => "")).slice(0, 200);
          throw new Error(`CajuPay: falha na autenticação (HTTP ${res.status}) ${detail}`.trim());
        }
        return { success: true, message: "Conexão com CajuPay validada com sucesso!" };
      }

      case "contabo": {
         const res = await fetch("https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "password",
            client_id: credentials["contabo_client_id"] || "",
            client_secret: credentials["contabo_client_secret"] || "",
            username: credentials["contabo_api_user"] || "",
            password: credentials["contabo_api_password"] || "",
          }),
        });
        if (!res.ok) throw new Error("Contabo: Falha na autenticação. Verifique as credenciais.");
        return { success: true, message: "Conexão com Contabo validada com sucesso!" };
      }

      default:
        return { success: true, message: "Este gateway não possui validação em tempo real ainda." };
    }
  } catch (err: any) {
    return { success: false, message: err?.message || "Erro desconhecido na validação." };
  }
}
