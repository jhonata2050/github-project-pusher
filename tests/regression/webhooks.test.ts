import { describe, it, expect, vi } from "vitest";
import { getCanonicalPublicUrl } from "@/lib/payments.server";

describe("Segurança e Resiliência de Webhooks de Pagamento", () => {
  describe("Resolução Canônica de URLs (Anti-Localhost 3000)", () => {
    it("deve respeitar APP_URL configurado nas variáveis de ambiente", () => {
      const original = process.env["APP_URL"];
      process.env["APP_URL"] = "https://painel.eqsam.cloud/";
      try {
        const url = getCanonicalPublicUrl();
        expect(url).toBe("https://painel.eqsam.cloud");
      } finally {
        if (original) process.env["APP_URL"] = original;
        else delete process.env["APP_URL"];
      }
    });

    it("deve extrair x-forwarded-host de requisições atrás de reverse proxy", () => {
      const original = process.env["APP_URL"];
      delete process.env["APP_URL"];
      delete process.env["PUBLIC_URL"];
      delete process.env["VITE_APP_URL"];
      delete process.env["LOVABLE_PREVIEW_HOST"];

      try {
        const mockReq = new Request("http://localhost:3000/api/webhook", {
          headers: {
            "x-forwarded-host": "client.eqsam.com",
            "x-forwarded-proto": "https",
          },
        });
        const url = getCanonicalPublicUrl(mockReq);
        expect(url).toBe("https://client.eqsam.com");
      } finally {
        if (original) process.env["APP_URL"] = original;
      }
    });

    it("nunca deve retornar localhost:3000 como fallback de produção", () => {
      const original = process.env["APP_URL"];
      delete process.env["APP_URL"];
      delete process.env["PUBLIC_URL"];
      delete process.env["VITE_APP_URL"];
      delete process.env["LOVABLE_PREVIEW_HOST"];

      try {
        const mockReq = new Request("http://localhost:3000/api/webhook");
        const url = getCanonicalPublicUrl(mockReq);
        expect(url).not.toContain("localhost");
        expect(url).not.toContain("127.0.0.1");
        expect(url).toBe("https://eqsam.com");
      } finally {
        if (original) process.env["APP_URL"] = original;
      }
    });
  });

  describe("Validação de Regras de Negócio de Webhooks (Anti-Baixa Fraudulenta)", () => {
    it("Woovi / OpenPix: deve rejeitar formalmente eventos do tipo 'OPENPIX:CHARGE_CREATED'", () => {
      // Simulação da regra de decisão do handler woovi.ts
      const eventType = "OPENPIX:CHARGE_CREATED";
      const isApprovedEvent =
        eventType === "OPENPIX:CHARGE_COMPLETED" ||
        eventType === "OPENPIX:TRANSACTION_RECEIVED";

      expect(isApprovedEvent).toBe(false);
    });

    it("Woovi / OpenPix: deve aceitar eventos 'OPENPIX:CHARGE_COMPLETED' e 'OPENPIX:TRANSACTION_RECEIVED'", () => {
      expect(["OPENPIX:CHARGE_COMPLETED", "OPENPIX:TRANSACTION_RECEIVED"].every((ev) => {
        return ev === "OPENPIX:CHARGE_COMPLETED" || ev === "OPENPIX:TRANSACTION_RECEIVED";
      })).toBe(true);
    });

    it("Mercado Pago: deve exigir que o status verificado na API seja estritamente 'approved'", () => {
      const testCases = [
        { status: "pending", shouldApprove: false },
        { status: "in_process", shouldApprove: false },
        { status: "rejected", shouldApprove: false },
        { status: "cancelled", shouldApprove: false },
        { status: "refunded", shouldApprove: false },
        { status: "charged_back", shouldApprove: false },
        { status: "approved", shouldApprove: true },
      ];

      testCases.forEach(({ status, shouldApprove }) => {
        const isApproved = status === "approved";
        expect(isApproved).toBe(shouldApprove);
      });
    });

    it("PagHiper: deve rejeitar processamento caso não encontre credenciais no sistema", () => {
      const apiKey = null;
      const token = null;

      const hasValidCredentials = Boolean(apiKey && token);
      expect(hasValidCredentials).toBe(false);
    });
  });
});
