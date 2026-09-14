import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wallet, Server, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { METHOD_LABELS, isGatewayConfigured, type GatewayDef } from "@/lib/gateways";
import { testGatewayConnection } from "@/lib/gateway-validation.functions";
import type { GatewayCardProps } from "./types";

export function GatewayCard({ gateway, settings, isVPS = false }: GatewayCardProps) {
  const [validating, setValidating] = useState(false);
  const configured = isGatewayConfigured(gateway.id, settings as Record<string, unknown>);

  const handleTest = async () => {
    const form = document.querySelector("form") as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const credentials: Record<string, string> = {};

    for (const field of gateway.fields) {
      credentials[field.key] = (formData.get(field.key) as string) || "";
    }

    setValidating(true);
    try {
      const res = await testGatewayConnection({ data: { gatewayId: gateway.id, credentials } });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message || "Falha na validação das credenciais.");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro técnico ao tentar validar conexão.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <Card className="rounded-3xl border-none shadow-sm">
      <CardHeader className="space-y-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {isVPS ? (
              <Server className="h-5 w-5 shrink-0 text-brand" />
            ) : (
              <Wallet className="h-5 w-5 shrink-0 text-brand" />
            )}
            <CardTitle className="truncate text-lg">{gateway.name}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-full text-[10px] px-3 gap-1"
              onClick={handleTest}
              disabled={validating}
            >
              {validating ? "..." : "Testar Conexão"}
            </Button>
            <Badge
              variant={configured ? "default" : "secondary"}
              className={`shrink-0 rounded-full text-[10px] uppercase ${
                configured
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              {configured ? "Ativo" : "Inativo"}
            </Badge>
          </div>
        </div>
        {!isVPS && (
          <div className="flex flex-wrap items-center gap-1.5">
            {gateway.methods.map((m) => (
              <span
                key={m}
                className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground"
              >
                {METHOD_LABELS[m]}
              </span>
            ))}
            <a
              href={gateway.docs}
              target="_blank"
              rel="noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              Docs <ExternalLink className="size-3" />
            </a>
          </div>
        )}
        {isVPS && (
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
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {gateway.fields.map((field) => (
          <div key={field.key} className="space-y-2">
            <Label className="flex items-center gap-2">
              {field.label}
              {field.optional && (
                <span className="text-[10px] text-muted-foreground">(opcional)</span>
              )}
            </Label>
            <Input
              name={field.key}
              type={field.secret ? "password" : "text"}
              placeholder={field.placeholder || (field.secret ? "••••••••••••••••" : "")}
              defaultValue={(settings?.[field.key] as string) || ""}
              className="rounded-xl focus-visible:ring-brand"
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
