export interface ProvisioningItemResult {
  serviceId?: string;
  domainName?: string;
  success: boolean;
  message?: string;
  error?: string;
  externalId?: string;
  appId?: string;
  appUuid?: string;
}

export interface ProvisioningResult {
  success: boolean;
  message?: string;
  results?: ProvisioningItemResult[];
}
