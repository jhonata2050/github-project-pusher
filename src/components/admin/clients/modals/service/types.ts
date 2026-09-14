export interface ClientEditServiceModalProps {
  editingService: any;
  setEditingService: (service: any) => void;
  servers?: any[] | undefined;
  allProducts?: any[] | undefined;
  clientId: string;
}
