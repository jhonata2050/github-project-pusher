import React from "react";
import { Globe } from "lucide-react";
import {
  type AppDomainsTabProps,
  DomainSubdomainCard,
  DomainCustomConnectionCard,
  DomainDnsInstructionsCard,
} from "../domains";

export type { AppDomainsTabProps };

export function AppDomainsTab({
  defaultSubdomain,
  cleanDefaultSubdomainHost,
  hasCustomDomain,
  activeCustomDomain,
  customDomainInput,
  setCustomDomainInput,
  userDomains,
  isVerifyingDns,
  verifyDnsMutation,
  saveDomainMutation,
  resetDomainMutation,
  dnsCheckResult,
  copyToClipboard,
  copiedDnsKey,
}: AppDomainsTabProps) {
  return (
    <div className="space-y-6">
      {/* Header explicativo da aba */}
      <div className="bg-gradient-to-r from-emerald-500/10 via-brand/5 to-transparent border border-emerald-500/20 p-5 sm:p-6 rounded-3xl space-y-2">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base">
          <Globe className="h-5 w-5 text-emerald-500" />
          <span>Gerenciamento de Domínio & Conexão Web</span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Para que seus visitantes acessem sua aplicação, ela possui um <strong>subdomínio padrão gratuito</strong> da EQSAM Cloud que já está funcionando. 
          Se você possui um <strong>domínio próprio registrado</strong> (como <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">seusite.com.br</code>), conecte-o abaixo para que nosso cluster reconheça suas requisições e gere o Certificado SSL de segurança automaticamente.
        </p>
      </div>

      {/* CARD 1: SUBDOMÍNIO PADRÃO DO SISTEMA */}
      <DomainSubdomainCard
        defaultSubdomain={defaultSubdomain}
        copyToClipboard={copyToClipboard}
        copiedDnsKey={copiedDnsKey}
      />

      {/* CARD 2: CONECTAR DOMÍNIO PERSONALIZADO */}
      <DomainCustomConnectionCard
        hasCustomDomain={hasCustomDomain}
        activeCustomDomain={activeCustomDomain}
        customDomainInput={customDomainInput}
        setCustomDomainInput={setCustomDomainInput}
        userDomains={userDomains}
        isVerifyingDns={isVerifyingDns}
        verifyDnsMutation={verifyDnsMutation}
        saveDomainMutation={saveDomainMutation}
        resetDomainMutation={resetDomainMutation}
      />

      {/* CARD 3: PASSO A PASSO DE APONTAMENTO DNS */}
      <DomainDnsInstructionsCard
        cleanDefaultSubdomainHost={cleanDefaultSubdomainHost}
        customDomainInput={customDomainInput}
        activeCustomDomain={activeCustomDomain}
        isVerifyingDns={isVerifyingDns}
        verifyDnsMutation={verifyDnsMutation}
        dnsCheckResult={dnsCheckResult}
        copyToClipboard={copyToClipboard}
        copiedDnsKey={copiedDnsKey}
      />
    </div>
  );
}
