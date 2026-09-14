export interface ClientAddServiceModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName?: string | null | undefined;
  clientEmail?: string | null | undefined;
  products?: any[] | undefined;
  servers?: any[] | undefined;
}

export interface HostingFieldsSectionProps {
  newServiceDomain: string;
  setNewServiceDomain: (val: string) => void;
  newServiceServer: string;
  setNewServiceServer: (val: string) => void;
  newServiceUsername: string;
  setNewServiceUsername: (val: string) => void;
  newServicePassword: string;
  setNewServicePassword: (val: string) => void;
  newServiceProvision: boolean;
  setNewServiceProvision: (val: boolean) => void;
  servers?: any[] | undefined;
}

export interface VpsFieldsSectionProps {
  availableVpsInstances?: any[] | undefined;
  newVpsInstanceId: string;
  setNewVpsInstanceId: (val: string) => void;
  newVpsHostname: string;
  setNewVpsHostname: (val: string) => void;
  newVpsIpAddress: string;
  setNewVpsIpAddress: (val: string) => void;
  newVpsExternalId: string;
  setNewVpsExternalId: (val: string) => void;
  newVpsOsTemplate: string;
  setNewVpsOsTemplate: (val: string) => void;
  newVpsRegion: string;
  setNewVpsRegion: (val: string) => void;
  newVpsSshUser: string;
  setNewVpsSshUser: (val: string) => void;
  newVpsSshPort: number;
  setNewVpsSshPort: (val: number) => void;
  newVpsSshPassword: string;
  setNewVpsSshPassword: (val: string) => void;
}

export interface BillingFieldsSectionProps {
  newServiceBillingCycle: "monthly" | "quarterly" | "semiannually" | "annually" | "biennially";
  setNewServiceBillingCycle: (val: "monthly" | "quarterly" | "semiannually" | "annually" | "biennially") => void;
  newServiceStatus: "active" | "pending" | "suspended" | "cancelled";
  setNewServiceStatus: (val: "active" | "pending" | "suspended" | "cancelled") => void;
  newServiceNextDue: string;
  setNewServiceNextDue: (val: string) => void;
  newServiceInvoice: boolean;
  setNewServiceInvoice: (val: boolean) => void;
  newServiceNotes: string;
  setNewServiceNotes: (val: string) => void;
}
