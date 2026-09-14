import { 
  User, 
  Mail, 
  CreditCard, 
  Server, 
  LifeBuoy, 
  History,
  Database,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientInfoTab } from "../tabs/ClientInfoTab";
import { ClientServicesTab } from "../tabs/ClientServicesTab";
import { ClientFinanceTab } from "../tabs/ClientFinanceTab";
import { ClientEmailsTab } from "../tabs/ClientEmailsTab";
import { ClientTicketsTab } from "../tabs/ClientTicketsTab";
import { ClientProvisioningTab } from "../tabs/ClientProvisioningTab";
import { ClientSystemLogsTab } from "../tabs/ClientSystemLogsTab";
import type { ClientDetailTabsProps } from "./types";

export function ClientDetailTabs({
  clientId,
  client,
  servers,
  isEditing,
  setIsEditing,
  onSubmit,
  isUpdatingProfile,
  onOpenChangePasswordModal,
  onSendPasswordReset,
  isSendingReset,
  onAddService,
  onEditService,
  onOpenBalanceModal,
  onOpenNewInvoiceModal,
  onManageInvoice,
}: ClientDetailTabsProps) {
  return (
    <Tabs defaultValue="info" className="w-full">
      <div className="overflow-x-auto pb-2">
        <TabsList className="bg-muted/50 p-1 rounded-2xl h-10 w-max min-w-full justify-start sm:w-auto">
          <TabsTrigger value="info" className="rounded-xl flex gap-2 text-xs py-1.5"><User className="size-3.5" /> Dados</TabsTrigger>
          <TabsTrigger value="services" className="rounded-xl flex gap-2 text-xs py-1.5"><Server className="size-3.5" /> Serviços</TabsTrigger>
          <TabsTrigger value="finance" className="rounded-xl flex gap-2 text-xs py-1.5"><CreditCard className="size-3.5" /> Financeiro</TabsTrigger>
          <TabsTrigger value="emails" className="rounded-xl flex gap-2 text-xs py-1.5"><Mail className="size-3.5" /> E-mails</TabsTrigger>
          <TabsTrigger value="tickets" className="rounded-xl flex gap-2 text-xs py-1.5"><LifeBuoy className="size-3.5" /> Tickets</TabsTrigger>
          <TabsTrigger value="provisioning" className="rounded-xl flex gap-2 text-xs py-1.5"><History className="size-3.5" /> Provisionamento</TabsTrigger>
          <TabsTrigger value="system-logs" className="rounded-xl flex gap-2 text-xs py-1.5"><Database className="size-3.5" /> Auditoria</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="info" className="mt-6">
        <ClientInfoTab
          client={client}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onSubmit={onSubmit}
          isUpdatingProfile={isUpdatingProfile}
          onOpenChangePasswordModal={onOpenChangePasswordModal}
          onSendPasswordReset={onSendPasswordReset}
          isSendingReset={isSendingReset}
        />
      </TabsContent>

      <TabsContent value="services" className="mt-6">
        <ClientServicesTab
          services={client.services}
          servers={servers}
          isLoading={false}
          onAddService={onAddService}
          onEditService={onEditService}
        />
      </TabsContent>

      <TabsContent value="finance" className="mt-6">
        <ClientFinanceTab
          accountBalance={Number(client.account_balance || 0)}
          invoices={client.invoices}
          isLoading={false}
          onOpenBalanceModal={onOpenBalanceModal}
          onOpenNewInvoiceModal={onOpenNewInvoiceModal}
          onManageInvoice={onManageInvoice}
        />
      </TabsContent>

      <TabsContent value="emails" className="mt-6">
        <ClientEmailsTab
          emailLogs={client.email_logs}
          isLoading={false}
        />
      </TabsContent>

      <TabsContent value="tickets" className="mt-6">
        <ClientTicketsTab
          tickets={client.tickets}
          isLoading={false}
        />
      </TabsContent>

      <TabsContent value="provisioning" className="mt-6">
        <ClientProvisioningTab clientId={clientId} />
      </TabsContent>

      <TabsContent value="system-logs" className="mt-6">
        <ClientSystemLogsTab clientId={clientId} />
      </TabsContent>
    </Tabs>
  );
}
