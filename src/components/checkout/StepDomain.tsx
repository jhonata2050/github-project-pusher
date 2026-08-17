import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { validateDomain } from "@/lib/checkout.functions";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export function StepDomain({ domain, setDomain, domainType, setDomainType, onValidChange }: any) {
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const checkDomain = useServerFn(validateDomain);

  const handleBlur = async () => {
    if (!domain || domain.length < 4 || !domain.includes(".")) {
      setError("Por favor, insira um domínio válido");
      setSuccess(false);
      onValidChange?.(false);
      return;
    }

    setIsValidating(true);
    setError(null);
    setSuccess(false);
    
    try {
      const result = await checkDomain({ data: { domain } });
      if (!result.valid) {
        setError(result.message || "Domínio inválido");
        onValidChange?.(false);
      } else {
        setSuccess(true);
        onValidChange?.(true);
      }
    } catch (err) {
      setError("Erro ao validar domínio. Tente novamente.");
      onValidChange?.(false);
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Escolher Domínio</h2>
      <RadioGroup value={domainType} onValueChange={setDomainType} className="grid gap-4">
        <div className="flex items-center space-x-3 border p-4 rounded-xl">
          <RadioGroupItem value="register" id="r1" />
          <Label htmlFor="r1">Registrar novo domínio</Label>
        </div>
        <div className="flex items-center space-x-3 border p-4 rounded-xl">
          <RadioGroupItem value="existing" id="r2" />
          <Label htmlFor="r2">Usar domínio existente</Label>
        </div>
      </RadioGroup>
      <div className="relative">
        <Input
          placeholder="exemplo.com.br"
          value={domain}
          onChange={(e) => {
            setDomain(e.target.value);
            setError(null);
            setSuccess(false);
            onValidChange?.(false);
          }}
          onBlur={handleBlur}
          className={cn(
            "h-12 rounded-xl pr-10",
            error && "border-destructive focus-visible:ring-destructive",
            success && "border-green-500 focus-visible:ring-green-500"
          )}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValidating && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          {error && <AlertCircle className="size-4 text-destructive" />}
          {success && <CheckCircle2 className="size-4 text-green-500" />}
        </div>
      </div>
      {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="size-3" /> {error}</p>}
      {success && <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="size-3" /> Domínio disponível!</p>}
    </div>
  );
}

import { cn } from "@/lib/utils";
