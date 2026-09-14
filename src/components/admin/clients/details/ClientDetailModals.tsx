import { ClientBalanceModal } from "../modals/ClientBalanceModal";
import { ClientChangePasswordModal } from "../modals/ClientChangePasswordModal";
import { ClientResetLinkModal } from "../modals/ClientResetLinkModal";
import { ClientEditServiceModal } from "../modals/ClientEditServiceModal";
import { ClientAddServiceModal } from "../modals/ClientAddServiceModal";
import { ClientManageInvoiceModal } from "../modals/ClientManageInvoiceModal";
import { ClientNewInvoiceModal } from "../modals/ClientNewInvoiceModal";
import type { ClientDetailModalsProps } from "./types";

export function ClientDetailModals({
  clientId,
  client,
  servers,
  products,
  isBalanceModalOpen,
  setIsBalanceModalOpen,
  editingService,
  setEditingService,
  isAddServiceModalOpen,
  setIsAddServiceModalOpen,
  managingInvoice,
  setManagingInvoice,
  isManageInvoiceModalOpen,
  setIsManageInvoiceModalOpen,
  isNewInvoiceModalOpen,
  setIsNewInvoiceModalOpen,
  isChangePasswordModalOpen,
  setIsChangePasswordModalOpen,
  resetLinkResult,
  onCloseResetLinkModal,
}: ClientDetailModalsProps) {
  return (
    <>
      <ClientBalanceModal
        clientId={clientId}
        isOpen={isBalanceModalOpen}
        onOpenChange={setIsBalanceModalOpen}
      />

      <ClientEditServiceModal
        editingService={editingService}
        setEditingService={setEditingService}
        servers={servers}
        allProducts={products}
        clientId={clientId}
      />

      <ClientAddServiceModal
        isOpen={isAddServiceModalOpen}
        onOpenChange={setIsAddServiceModalOpen}
        clientId={clientId}
        clientName={client.full_name}
        clientEmail={client.email}
        products={products}
        servers={servers}
      />

      <ClientManageInvoiceModal
        managingInvoice={managingInvoice}
        setManagingInvoice={setManagingInvoice}
        isOpen={isManageInvoiceModalOpen}
        onOpenChange={setIsManageInvoiceModalOpen}
        clientId={clientId}
      />

      <ClientNewInvoiceModal
        isOpen={isNewInvoiceModalOpen}
        onOpenChange={setIsNewInvoiceModalOpen}
        clientId={clientId}
        services={client.services}
      />

      <ClientChangePasswordModal
        clientId={clientId}
        clientName={client.full_name}
        clientEmail={client.email}
        isOpen={isChangePasswordModalOpen}
        onOpenChange={setIsChangePasswordModalOpen}
      />

      <ClientResetLinkModal
        result={resetLinkResult}
        onClose={onCloseResetLinkModal}
        clientEmail={client.email}
      />
    </>
  );
}
