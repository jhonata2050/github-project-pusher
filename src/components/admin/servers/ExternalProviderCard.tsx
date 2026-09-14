import { useRef, useState } from "react";
import { Activity, AlertCircle, CheckCircle2, ExternalLink, Server } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isGatewayConfigured, type GatewayDef } from "@/lib/gateways";
import { testGatewayConnection } from "@/lib/gateway-validation.functions";

export interface ExternalProviderCardProps {
  gateway: GatewayDef;
  settings: any;
}

export function ExternalProviderCard({ gateway, settings }: ExternalProviderCardProps) {
  const [validating, setValidating] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const configured = isGatewayConfigured(gateway.id, settings as Record<string, unknown>);

  const handleTest = async () => {
    const credentials: Record<string, string> = {};
    gateway.fields.forEach((f) => {
      const el = cardRef.current?.querySelector<HTMLInputElement>(`input[name="${f.key}"]`);
      credentials[f.key] = (el?.value ?? (settings?.[f.key] as string) ?? "").trim();
    });

    const missing = gateway.required.filter((k) => !credentials[k]);
    if (missing.length > 0) {
      setTestResult({
        success: false,
        message: "Preencha todas as credenciais obrigatórias antes de testar.",
      });
      return;
    }

    setValidating(true);
    setTestResult(null);
    try {
      const result = await testGatewayConnection({ data: { gatewayId: gateway.id, credentials } });
      setTestResult(result);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (e: any) {
      const message = e?.message || "Falha ao testar a conexão.";
      setTestResult({ success: false, message });
      toast.error(message);
    } finally {
      setValidating(false);
    }
  };

  return (
    <Card ref={cardRef} className="rounded-3xl border-none shadow-sm">
      <CardHeader className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Server className="h-5 w-5 shrink-0 text-brand" />
            <CardTitle className="truncate text-lg">{gateway.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={configured ? "default" : "secondary"}
              className="shrink-0 rounded-full text-[10px] uppercase"
            >
              {configured ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <a
            href={gateway.docs}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
          >
            Docs <ExternalLink className="size-3" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {gateway.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label className="flex items-center gap-2">
              {field.label}
              {field.optional && <span className="text-[10px] text-muted-foreground">(opcional)</span>}
            </Label>
            <Input
              name={field.key}
              type={field.secret ? "password" : "text"}
              placeholder={field.placeholder}
              defaultValue={(settings?.[field.key] as string) ?? ""}
              className="rounded-xl"
            />
          </div>
        ))}

        {testResult && (
          <div
            className={`flex items-start gap-2 rounded-2xl border p-3 text-xs ${
              testResult.success
                ? "border-brand/20 bg-brand/5 text-foreground"
                : "border-destructive/20 bg-destructive/5 text-destructive"
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand" />
            ) : (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="break-words">{testResult.message}</span>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={validating}
          className="w-full rounded-2xl border-brand/20 text-brand hover:bg-brand/5 cursor-pointer"
        >
          <Activity className={`mr-2 h-4 w-4 ${validating ? "animate-pulse" : ""}`} />
          {validating ? "Testando..." : "Testar Conexão"}
        </Button>
      </CardContent>
    </Card>
  );
}
