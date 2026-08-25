import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface RegistrarDomainDetails {
  domain: string;
  status: string;
  nameservers: string[];
  autoRenew: boolean;
  isLocked: boolean;
  registrationDate?: string;
  expiryDate?: string;
  authCode?: string;
}

/**
 * Openprovider REST API Connector
 * https://api.openprovider.eu/v1beta
 */
export class OpenproviderRegistrar {
  private apiUrl: string;
  private username: string;
  private password: string;
  private token: string | null = null;

  constructor(username: string, password: string, isTest = false) {
    this.username = username;
    this.password = password;
    this.apiUrl = isTest
      ? "https://api.cte.openprovider.eu/v1beta"
      : "https://api.openprovider.eu/v1beta";
  }

  private async getAuthToken(): Promise<string> {
    if (this.token) return this.token;

    const res = await fetch(`${this.apiUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`[Openprovider] Falha de autenticação: ${err.desc || res.statusText}`);
    }

    const data = await res.json();
    this.token = data.data?.token;
    return this.token!;
  }

  private async request(endpoint: string, method = "GET", body?: any) {
    const token = await this.getAuthToken();
    const res = await fetch(`${this.apiUrl}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    if (!res.ok || (data.code && data.code !== 0)) {
      throw new Error(`[Openprovider API Error] ${data.desc || res.statusText}`);
    }

    return data.data;
  }

  /**
   * Registra um novo domínio
   */
  async registerDomain(params: {
    domainName: string;
    extension: string;
    periodYears: number;
    nameservers: string[];
    customerData: {
      name: string;
      email: string;
      phone: string;
      document?: string;
    };
  }) {
    const cleanDomain = params.domainName.replace(params.extension, '');
    const cleanExt = params.extension.replace(/^\./, '');

    const nameServers = params.nameservers.map((ns) => ({ name: ns }));

    const payload = {
      domain: {
        name: cleanDomain,
        extension: cleanExt,
      },
      period: params.periodYears || 1,
      name_servers: nameServers,
      autorenew: "default",
    };

    const res = await this.request("/domains", "POST", payload);
    return {
      success: true,
      domainId: res?.id,
      domainName: `${cleanDomain}.${cleanExt}`,
      expiryDate: res?.renewal_date || res?.expiration_date,
    };
  }

  /**
   * Renova um domínio existente
   */
  async renewDomain(domainId: number | string, periodYears = 1) {
    const res = await this.request(`/domains/${domainId}/renew`, "POST", {
      period: periodYears,
    });
    return {
      success: true,
      expiryDate: res?.renewal_date || res?.expiration_date,
    };
  }

  /**
   * Atualiza os Nameservers (DNS)
   */
  async updateNameservers(domainId: number | string, nameservers: string[]) {
    const nameServers = nameservers.map((ns) => ({ name: ns }));
    await this.request(`/domains/${domainId}`, "PUT", {
      name_servers: nameServers,
    });
    return { success: true };
  }

  /**
   * Ativa / Desativa o Bloqueio de Transferência (Transfer Lock)
   */
  async setTransferLock(domainId: number | string, isLocked: boolean) {
    await this.request(`/domains/${domainId}`, "PUT", {
      is_locked: isLocked,
    });
    return { success: true, isLocked };
  }

  /**
   * Obtém o Código de Transferência (Auth-Code / EPP)
   */
  async getAuthCode(domainId: number | string): Promise<string> {
    const res = await this.request(`/domains/${domainId}/auth-code`, "GET");
    return res?.auth_code || "";
  }
}
