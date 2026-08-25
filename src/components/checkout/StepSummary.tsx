import { Check } from "lucide-react";

export function StepSummary({ product, currentPrice, domain, vpsConfig, brl }: any) {
  const productType = product?.product_type?.toLowerCase() || "other";

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Check className="size-5 text-brand" />
        Resumo do Pedido
      </h2>
      <div className="rounded-2xl border p-6 space-y-4 bg-sidebar/50">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Produto:</span>
          <span className="font-bold">{product?.name}</span>
        </div>
        
        {productType === "hosting" && domain && (
          <div className="flex justify-between items-center border-t pt-4">
            <span className="text-muted-foreground">Domínio:</span>
            <span className="font-mono text-sm">{domain}</span>
          </div>
        )}

        {productType === "vps" && (
          <>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-muted-foreground">Hostname:</span>
              <span className="font-mono text-sm">{vpsConfig.hostname}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-muted-foreground">Sistema Operacional:</span>
              <span className="text-sm uppercase">{vpsConfig.os}</span>
            </div>
            <div className="flex justify-between items-center border-t pt-4">
              <span className="text-muted-foreground">Localização:</span>
              <span className="text-sm">{vpsConfig.location}</span>
            </div>
          </>
        )}

        <div className="flex justify-between items-center pt-6 border-t-2 border-brand/20">
          <span className="text-lg font-bold">Total a pagar:</span>
          <div className="text-right">
            <span className="text-2xl font-black text-brand">{brl.format(Number(currentPrice?.price ?? 0))}</span>
            <p className="text-[10px] text-muted-foreground uppercase">{currentPrice?.cycle}</p>
          </div>
        </div>
      </div>
      <p className="text-[10px] text-center text-muted-foreground px-4">
        Ao prosseguir para o pagamento, você declara estar ciente e de acordo com nossos Termos de Uso e Políticas de Privacidade.
      </p>
    </div>
  );
}
