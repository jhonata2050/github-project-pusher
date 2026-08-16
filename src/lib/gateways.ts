/**
 * Metadados dos gateways de pagamento (client-safe).
 * Cada gateway declara suas credenciais reais (muitos exigem par de chaves)
 * e os meios de pagamento realmente suportados pela API oficial.
 */

export type PaymentMethod = "pix" | "credit_card" | "boleto";

export type GatewayField = {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
  optional?: boolean;
};

export type GatewayDef = {
  id: string;
  name: string;
  docs: string;
  /** Credenciais obrigatórias mínimas para o gateway funcionar */
  required: string[];
  fields: GatewayField[];
  methods: PaymentMethod[];
};

export const METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  boleto: "Boleto",
};

export const GATEWAYS: GatewayDef[] = [
  {
    id: "abacatepay",
    name: "AbacatePay",
    docs: "https://docs.abacatepay.com",
    required: ["abacatepay_api_key"],
    methods: ["pix"],
    fields: [
      { key: "abacatepay_api_key", label: "API Key", placeholder: "abc_dev_...", secret: true },
      { key: "abacatepay_webhook_secret", label: "Webhook Secret", secret: true, optional: true },
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    docs: "https://docs.stripe.com/api",
    required: ["stripe_secret_key"],
    methods: ["credit_card", "boleto"],
    fields: [
      { key: "stripe_secret_key", label: "Secret Key", placeholder: "sk_live_...", secret: true },
      { key: "stripe_publishable_key", label: "Publishable Key", placeholder: "pk_live_..." },
      { key: "stripe_webhook_secret", label: "Webhook Secret", placeholder: "whsec_...", secret: true, optional: true },
    ],
  },
  {
    id: "mercadopago",
    name: "Mercado Pago",
    docs: "https://www.mercadopago.com.br/developers/pt/reference",
    required: ["mercadopago_access_token"],
    methods: ["pix", "credit_card", "boleto"],
    fields: [
      { key: "mercadopago_access_token", label: "Access Token", placeholder: "APP_USR-...", secret: true },
      { key: "mercadopago_public_key", label: "Public Key", placeholder: "APP_USR-..." },
      { key: "mercadopago_webhook_secret", label: "Assinatura secreta (webhook)", secret: true, optional: true },
    ],
  },
  {
    id: "woovi",
    name: "Woovi / OpenPix",
    docs: "https://developers.woovi.com",
    required: ["woovi_app_id"],
    methods: ["pix"],
    fields: [
      { key: "woovi_app_id", label: "AppID", placeholder: "Q2xpZW50X0lkX...", secret: true },
      { key: "woovi_webhook_secret", label: "Webhook Secret", secret: true, optional: true },
    ],
  },
  {
    id: "paghiper",
    name: "PagHiper",
    docs: "https://dev.paghiper.com",
    required: ["paghiper_api_key", "paghiper_token"],
    methods: ["pix", "boleto"],
    fields: [
      { key: "paghiper_api_key", label: "apiKey", placeholder: "apk_...", secret: true },
      { key: "paghiper_token", label: "token", secret: true },
    ],
  },
  {
    id: "cajupay",
    name: "CajuPay",
    docs: "https://cajupay.com.br",
    required: ["cajupay_client_id", "cajupay_client_secret"],
    methods: ["pix", "credit_card", "boleto"],
    fields: [
      { key: "cajupay_client_id", label: "Client ID", secret: true },
      { key: "cajupay_client_secret", label: "Client Secret", secret: true },
      { key: "cajupay_base_url", label: "Base URL da API", placeholder: "https://api.cajupay.com.br", optional: true },
    ],
  },
  {
    id: "contabo",
    name: "Contabo VPS",
    docs: "https://api.contabo.com",
    required: ["contabo_client_id", "contabo_client_secret", "contabo_api_user", "contabo_api_password"],
    methods: [],
    fields: [
      { key: "contabo_client_id", label: "Client ID", secret: true },
      { key: "contabo_client_secret", label: "Client Secret", secret: true },
      { key: "contabo_api_user", label: "API User", placeholder: "Seu usuário Contabo" },
      { key: "contabo_api_password", label: "API Password", secret: true },
    ],
  },
];

export const ALL_GATEWAY_SETTING_KEYS = GATEWAYS.flatMap((g) => g.fields.map((f) => f.key));

export function gatewayById(id: string) {
  return GATEWAYS.find((g) => g.id === id);
}

export function isGatewayConfigured(id: string, settings: Record<string, unknown> | undefined) {
  const def = gatewayById(id);
  if (!def || !settings) return false;
  return def.required.every((k) => {
    const v = settings[k];
    return typeof v === "string" && v.trim().length > 0 && !v.includes("placeholder");
  });
}
