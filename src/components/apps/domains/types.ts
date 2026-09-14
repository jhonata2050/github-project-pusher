export interface UserDomainItem {
  id: string;
  domain_name: string;
  [key: string]: any;
}

export interface DnsCheckResult {
  isConfigured: boolean;
  message: string;
  status?: string | undefined;
  aRecords?: string[] | undefined;
  [key: string]: any;
}

export interface AppDomainsTabProps {
  defaultSubdomain: string;
  cleanDefaultSubdomainHost: string;
  hasCustomDomain: boolean;
  activeCustomDomain: string;
  customDomainInput: string;
  setCustomDomainInput: (val: string) => void;
  userDomains: UserDomainItem[];
  isVerifyingDns: boolean;
  verifyDnsMutation: any;
  saveDomainMutation: any;
  resetDomainMutation: any;
  dnsCheckResult: DnsCheckResult | null | undefined;
  copyToClipboard: (text: string, key: string) => void;
  copiedDnsKey: string | null;
}

export interface DomainSubdomainCardProps {
  defaultSubdomain: string;
  copyToClipboard: (text: string, key: string) => void;
  copiedDnsKey: string | null;
}

export interface DomainCustomConnectionCardProps {
  hasCustomDomain: boolean;
  activeCustomDomain: string;
  customDomainInput: string;
  setCustomDomainInput: (val: string) => void;
  userDomains: UserDomainItem[];
  isVerifyingDns: boolean;
  verifyDnsMutation: any;
  saveDomainMutation: any;
  resetDomainMutation: any;
}

export interface DomainDnsInstructionsCardProps {
  cleanDefaultSubdomainHost: string;
  customDomainInput: string;
  activeCustomDomain: string;
  isVerifyingDns: boolean;
  verifyDnsMutation: any;
  dnsCheckResult: DnsCheckResult | null | undefined;
  copyToClipboard: (text: string, key: string) => void;
  copiedDnsKey: string | null;
}
