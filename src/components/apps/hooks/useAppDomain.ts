import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  updateApplicationDomain,
  resetApplicationDomain,
  verifyApplicationDomainDns,
} from "@/lib/cloud-apps.functions";
import { generateAppDefaultFqdn } from "@/lib/app-subdomain";
import type { DnsCheckResult } from "./types";

interface UseAppDomainParams {
  appId: string;
  app: any;
  refetchApp: () => void;
}

export function useAppDomain({ appId, app, refetchApp }: UseAppDomainParams) {
  const queryClient = useQueryClient();

  const [customDomainInput, setCustomDomainInput] = useState("");
  const [dnsCheckResult, setDnsCheckResult] = useState<DnsCheckResult | null>(null);
  const [isVerifyingDns, setIsVerifyingDns] = useState(false);
  const [copiedDnsKey, setCopiedDnsKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key?: string) => {
    navigator.clipboard.writeText(text);
    if (key) {
      setCopiedDnsKey(key);
      setTimeout(() => setCopiedDnsKey(null), 2000);
    }
    toast.success("Copiado para a área de transferência!");
  };

  // Identificação do Subdomínio Padrão vs Domínio Personalizado
  const defaultSubdomain =
    (app as any)?.default_subdomain ||
    (app?.fqdn && !app.fqdn.includes("/app-") && (app.fqdn.includes(".dk1.eqsam.com") || app.fqdn.includes(".eqsam.cloud"))
      ? app.fqdn
      : app
      ? generateAppDefaultFqdn(app)
      : "https://app-000000000000.dk1.eqsam.com");

  const cleanDefaultSubdomainHost = defaultSubdomain
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  const safeOnlineUrl =
    app?.fqdn?.startsWith("http://") && (app.fqdn.includes(".dk1.eqsam.com") || app.fqdn.includes(".eqsam.cloud"))
      ? app.fqdn.replace(/^http:\/\//i, "https://")
      : app?.fqdn || `https://${cleanDefaultSubdomainHost}`;

  const hasCustomDomain = Boolean(
    (app as any)?.custom_domain ||
      (app?.fqdn && !app.fqdn.includes(".dk1.eqsam.com") && !app.fqdn.includes(".eqsam.cloud"))
  );

  const activeCustomDomain =
    (app as any)?.custom_domain ||
    (hasCustomDomain ? app?.fqdn?.replace(/^https?:\/\//i, "").replace(/\/+$/, "") : "");

  // Sincronizar input de domínio com o app
  useEffect(() => {
    if (app) {
      const isDefault = app.fqdn?.includes(".dk1.eqsam.com") || app.fqdn?.includes(".eqsam.cloud");
      if ((app as any).custom_domain) {
        setCustomDomainInput((app as any).custom_domain);
      } else if (!isDefault && app.fqdn) {
        setCustomDomainInput(app.fqdn.replace(/^https?:\/\//i, "").replace(/\/+$/, ""));
      } else {
        setCustomDomainInput("");
      }
    }
  }, [app]);

  const saveDomainMutation = useMutation({
    mutationFn: async (domainParam?: string) => {
      const rawDomain = (typeof domainParam === "string" ? domainParam : customDomainInput)
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .trim();

      if (!rawDomain || rawDomain.length < 3) {
        throw new Error("Por favor informe um domínio válido (ex: meusite.com.br ou app.meusite.com).");
      }

      return updateApplicationDomain({ data: { appId, domain: rawDomain } });
    },
    onSuccess: () => {
      toast.success("Domínio personalizado conectado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      refetchApp();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar domínio.");
    },
  });

  const resetDomainMutation = useMutation({
    mutationFn: async () => {
      return resetApplicationDomain({ data: { appId } });
    },
    onSuccess: () => {
      toast.success("Subdomínio padrão restaurado!");
      setCustomDomainInput("");
      setDnsCheckResult(null);
      queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
      refetchApp();
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao redefinir domínio.");
    },
  });

  const verifyDnsMutation = useMutation({
    mutationFn: async (domainParam?: string) => {
      const targetDomain = (typeof domainParam === "string" ? domainParam : customDomainInput || activeCustomDomain)
        .replace(/^https?:\/\//i, "")
        .replace(/\/+$/, "")
        .trim();

      if (!targetDomain) throw new Error("Informe ou selecione um domínio para verificar.");
      setIsVerifyingDns(true);
      return verifyApplicationDomainDns({ data: { domain: targetDomain } });
    },
    onSuccess: (res) => {
      setIsVerifyingDns(false);
      setDnsCheckResult(res);
      if (res.isConfigured) {
        toast.success("Apontamento DNS detectado com sucesso!");
      } else {
        toast.info(res.message);
      }
    },
    onError: (err: any) => {
      setIsVerifyingDns(false);
      toast.error(err.message || "Erro ao consultar DNS.");
    },
  });

  return {
    customDomainInput,
    setCustomDomainInput,
    dnsCheckResult,
    setDnsCheckResult,
    isVerifyingDns,
    copiedDnsKey,
    copyToClipboard,
    defaultSubdomain,
    cleanDefaultSubdomainHost,
    safeOnlineUrl,
    hasCustomDomain,
    activeCustomDomain,
    saveDomainMutation,
    resetDomainMutation,
    verifyDnsMutation,
  };
}
