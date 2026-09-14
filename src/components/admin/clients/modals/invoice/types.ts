export interface ClientManageInvoiceModalProps {
  managingInvoice: any;
  setManagingInvoice: React.Dispatch<React.SetStateAction<any>>;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
}

export interface InvoiceQuickActionsProps {
  managingInvoice: any;
  onUpdateInvoice: (data: any) => void;
  isPending: boolean;
}

export interface InvoiceFormFieldsProps {
  managingInvoice: any;
  setManagingInvoice: React.Dispatch<React.SetStateAction<any>>;
}
