import { ProvisioningLogsTable } from "../ProvisioningLogsTable";

interface ClientProvisioningTabProps {
  clientId: string;
}

export function ClientProvisioningTab({ clientId }: ClientProvisioningTabProps) {
  return <ProvisioningLogsTable clientId={clientId} />;
}
