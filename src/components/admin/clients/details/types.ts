export interface ClientDetailHeaderProps {
  client: any;
  isImpersonating: boolean;
  onImpersonate: () => void;
  onOpenBalanceModal: () => void;
}

export interface ClientDetailTabsProps {
  clientId: string;
  client: any;
  servers: any[];
  products: any[];
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isUpdatingProfile: boolean;
  onOpenChangePasswordModal: () => void;
  onSendPasswordReset: () => void;
  isSendingReset: boolean;
  onAddService: () => void;
  onEditService: (srv: any) => void;
  onOpenBalanceModal: () => void;
  onOpenNewInvoiceModal: () => void;
  onManageInvoice: (inv: any) => void;
}

export interface ClientDetailModalsProps {
  clientId: string;
  client: any;
  servers: any[];
  products: any[];
  isBalanceModalOpen: boolean;
  setIsBalanceModalOpen: (val: boolean) => void;
  editingService: any;
  setEditingService: (val: any) => void;
  isAddServiceModalOpen: boolean;
  setIsAddServiceModalOpen: (val: boolean) => void;
  managingInvoice: any;
  setManagingInvoice: (val: any) => void;
  isManageInvoiceModalOpen: boolean;
  setIsManageInvoiceModalOpen: (val: boolean) => void;
  isNewInvoiceModalOpen: boolean;
  setIsNewInvoiceModalOpen: (val: boolean) => void;
  isChangePasswordModalOpen: boolean;
  setIsChangePasswordModalOpen: (val: boolean) => void;
  resetLinkResult: { link: string; emailSent: boolean } | null;
  onCloseResetLinkModal: () => void;
}
