import type { GatewayDef } from "@/lib/gateways";

export interface GatewayCardProps {
  gateway: GatewayDef;
  settings: any;
  isVPS?: boolean | undefined;
}

export interface FinanceTabProps {
  settings: any;
  defaultWebhook?: string | undefined;
  copyToClipboard?: ((text: string) => void) | undefined;
}
