import { gatewayById } from "./gateways";
import { handleGatewayError } from "./gateway-errors.server";

export async function validateGateway(gatewayId: string, credentials: Record<string, string>) {
  const def = gatewayById(gatewayId);
  if (!def) return { success: false, message: "Gateway não encontrado" };

  // 1. Validação de campos obrigatórios
  const missing = def.required.filter(key => !credentials[key] || credentials[key].trim() === "");
  if (missing.length > 0) {
    const labels = missing.map(key => def.fields.find(f => f.key === key)?.label || key);
    return { success: false, message: `Os seguintes campos são obrigatórios: ${labels.join(", ")}.` };
  }

  try {
    switch (gatewayId) {
      case "abacatepay": {
        const res = await fetch("https://api.abacatepay.com/v1/billing/list", {
          headers: { Authorization: `Bearer ${credentials["abacatepay_api_key"]}` },
        });
        if (!res.ok) throw new Error(await handleGatewayError(res, "AbacatePay"));
        return { success: true, message: "Conexão com AbacatePay validada com sucesso!" };
      }

      case "stripe": {
        const res = await fetch("https://api.stripe.com/v1/balance", {
          headers: { Authorization: `Bearer ${credentials["stripe_secret_key"]}` },
        });
        if (!res.ok) throw new Error(await handleGatewayError(res, "Stripe"));
        return { success: true, message: "Conexão com Stripe validada com sucesso!" };
      }

      case "mercadopago": {
        const res = await fetch("https://api.mercadopago.com/v1/payment_methods", {
          headers: { Authorization: `Bearer ${credentials["mercadopago_access_token"]}` },
        });
        if (!res.ok) throw new Error(await handleGatewayError(res, "Mercado Pago"));
        return { success: true, message: "Conexão com Mercado Pago validada com sucesso!" };
      }

      case "woovi": {
        const res = await fetch("https://api.woovi.com/api/openpix/v1/charge?limit=1", {
          headers: { Authorization: credentials["woovi_app_id"] },
        });
        if (!res.ok) throw new Error(await handleGatewayError(res, "Woovi"));
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
        if (!res.ok) throw new Error(await handleGatewayError(res, "PagHiper"));
        const json = await res.json();
        if (json?.transaction_list?.result === "reject") {
          return { success: false, message: `PagHiper: ${json.transaction_list.response_message}` };
        }
        return { success: true, message: "Conexão com PagHiper validada com sucesso!" };
      }

      case "cajupay": {
        const baseUrl = (credentials["cajupay_base_url"] || "https://api.cajupay.com.br").replace(/\/$/, "");
        const res = await fetch(`${baseUrl}/oauth/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "client_credentials",
            client_id: credentials["cajupay_client_id"],
            client_secret: credentials["cajupay_client_secret"],
          }),
        });
        if (!res.ok) throw new Error(await handleGatewayError(res, "CajuPay"));
        return { success: true, message: "Conexão com CajuPay validada com sucesso!" };
      }

      case "contabo": {
         const res = await fetch("https://auth.contabo.com/auth/realms/contabo/protocol/openid-connect/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "password",
            client_id: credentials["contabo_client_id"],
            client_secret: credentials["contabo_client_secret"],
            username: credentials["contabo_api_user"],
            password: credentials["contabo_api_password"],
          }),
        });
        if (!res.ok) throw new Error(await handleGatewayError(res, "Contabo"));
        return { success: true, message: "Conexão com Contabo validada com sucesso!" };
      }

      default:
        return { success: true, message: "Este gateway não possui validação em tempo real ainda." };
    }
  } catch (err: any) {
    return { 
      success: false, 
      message: err?.message || "Erro inesperado na conexão com o gateway." 
    };
  }
}
