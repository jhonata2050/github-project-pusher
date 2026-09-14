export interface ClientItem {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name: string | null;
  tax_id: string | null;
  phone: string | null;
  status: string | null;
  created_at: string;
  whmcs_id?: string | number | null;
}
