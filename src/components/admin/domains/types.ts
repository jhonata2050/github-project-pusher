export interface ClientDomain {
  id: string;
  user_id: string;
  domain?: string | undefined;
  domain_name?: string | undefined;
  status: string | null;
  registration_date?: string | null | undefined;
  registrar?: string | null | undefined;
  expiry_date?: string | null | undefined;
  created_at?: string | null | undefined;
  profiles?: {
    id?: string | undefined;
    full_name?: string | null | undefined;
    email?: string | null | undefined;
    phone?: string | null | undefined;
  } | null | undefined;
  [key: string]: any;
}

export interface TldPricing {
  extension: string;
  cost_price: number;
  register_price: number;
  renew_price: number;
  transfer_price?: number | undefined;
  is_active: boolean;
  registrar?: string | undefined;
  [key: string]: any;
}

export interface DomainSettings {
  defaultRegistrar?: string | undefined;
  openproviderUsername?: string | undefined;
  openproviderPassword?: string | undefined;
  openproviderTestMode?: boolean | undefined;
  resellerclubUserid?: string | undefined;
  resellerclubApikey?: string | undefined;
  resellerclubTestMode?: boolean | undefined;
  defaultNs1?: string | undefined;
  defaultNs2?: string | undefined;
  defaultNs3?: string | undefined;
  defaultNs4?: string | undefined;
}
