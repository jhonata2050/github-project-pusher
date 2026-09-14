import { GATEWAYS } from "@/lib/gateways";
import { GatewayCard } from "./GatewayCard";

interface FinanceGatewaysTabProps {
  settings: any;
}

export function FinanceGatewaysTab({ settings }: FinanceGatewaysTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {GATEWAYS.filter((g) => g.id !== "contabo").map((gateway) => (
        <GatewayCard key={gateway.id} gateway={gateway} settings={settings} />
      ))}
    </div>
  );
}
