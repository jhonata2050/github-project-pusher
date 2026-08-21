export interface HostingAccountDetails {
  username: string;
  domain: string;
  email: string;
  package?: string;
}

export interface HostingProvider {
  createAccount(details: HostingAccountDetails): Promise<any>;
  suspendAccount(username: string): Promise<any>;
  unsuspendAccount(username: string): Promise<any>;
  deleteAccount(username: string): Promise<any>;
  getAccount(username: string): Promise<any>;
  getAccountStatus(username: string): Promise<any>;
  generateClientLogin(username: string, redirectUrl?: string): Promise<string>;
}
