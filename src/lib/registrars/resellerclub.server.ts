/**
 * ResellerClub HTTP / REST API Connector
 * https://manage.resellerclub.com/kb/answer/754
 */
export class ResellerClubRegistrar {
  private apiUrl: string;
  private authUser: string;
  private apiKey: string;

  constructor(authUserId: string, apiKey: string, isTest = false) {
    this.authUser = authUserId;
    this.apiKey = apiKey;
    this.apiUrl = isTest
      ? "https://test.httpapi.com/api"
      : "https://httpapi.com/api";
  }

  private async request(endpoint: string, method = "GET", params: Record<string, string | number> = {}) {
    const searchParams = new URLSearchParams({
      "auth-userid": this.authUser,
      "api-key": this.apiKey,
      ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    });

    let url = `${this.apiUrl}${endpoint}`;
    let options: RequestInit = { method };

    if (method === "GET") {
      url += `?${searchParams.toString()}`;
    } else {
      options.headers = { "Content-Type": "application/x-www-form-urlencoded" };
      options.body = searchParams.toString();
    }

    const res = await fetch(url, options);
    const json = await res.json().catch(() => ({}));

    if (json.status === "ERROR" || json.error) {
      throw new Error(`[ResellerClub API Error] ${json.message || json.error || res.statusText}`);
    }

    return json;
  }

  async checkAvailability(domainName: string, tlds: string[]) {
    const res = await this.request("/domains/available.json", "GET", {
      "domain-name": domainName,
      tlds: tlds.join(","),
    });
    return res;
  }

  async registerDomain(params: {
    domainName: string;
    periodYears: number;
    nameservers: string[];
    customerId: string;
  }) {
    const res = await this.request("/domains/register.json", "POST", {
      "domain-name": params.domainName,
      years: params.periodYears || 1,
      ns: params.nameservers.join(","),
      "customer-id": params.customerId,
      "reg-contact-id": params.customerId,
      "admin-contact-id": params.customerId,
      "tech-contact-id": params.customerId,
      "billing-contact-id": params.customerId,
      "invoice-option": "NoInvoice",
      "protect-privacy": false,
    });
    return res;
  }

  async updateNameservers(orderId: string | number, nameservers: string[]) {
    return this.request("/domains/modify-ns.json", "POST", {
      "order-id": orderId,
      ns: nameservers.join(","),
    });
  }

  async setTransferLock(orderId: string | number, isLocked: boolean) {
    const endpoint = isLocked ? "/domains/enable-theft-protection.json" : "/domains/disable-theft-protection.json";
    return this.request(endpoint, "POST", {
      "order-id": orderId,
    });
  }

  async getAuthCode(orderId: string | number): Promise<string> {
    const res = await this.request("/domains/locks.json", "GET", {
      "order-id": orderId,
    });
    return res?.authcode || "";
  }
}
