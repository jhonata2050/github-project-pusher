import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export function StepDomain({ domain, setDomain, domainType, setDomainType }: any) {
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
      <Input
        placeholder="exemplo.com.br"
        value={domain}
        onChange={(e) => setDomain(e.target.value)}
        className="h-12 rounded-xl"
      />
    </div>
  );
}
