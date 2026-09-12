import type { PaymentMethod } from "../gateways";

export type PaymentResult = {
  transactionId?: string | undefined;
  method: PaymentMethod;
  gateway: string;
  amount: number;
  checkoutUrl?: string | undefined;
  pixCode?: string | undefined;
  qrCodeUrl?: string | undefined;
  digitableLine?: string | undefined;
};

export interface PaymentCustomer {
  name: string;
  email: string;
  taxId: string;
  phone: string;
}

export interface GatewaySessionParams {
  userId: string;
  invoice: any;
  profile: any;
  method: PaymentMethod;
  cfg: Record<string, string>;
  customer: PaymentCustomer;
  amount: number;
  cents: number;
  ref: string;
  description: string;
  returnUrl: string;
  base: {
    method: PaymentMethod;
    gateway: string;
    amount: number;
  };
}

export function onlyDigits(v?: string | null): string {
  return (v || "").replace(/\D/g, "");
}
