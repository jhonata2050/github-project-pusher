export interface DomainDetails {
  id: string;
  domain_name: string;
  status: string;
  registration_date?: string | null;
  expiry_date?: string | null;
  created_at: string;
  nameservers?: string[];
  is_locked?: boolean | null;
  auto_renew?: boolean | null;
  registrar?: string | null;
  [key: string]: any;
}
