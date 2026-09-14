import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ProfileFormState } from "./types";

interface ProfileBillingAddressSectionProps {
  form: ProfileFormState;
  onChange: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
}

export function ProfileBillingAddressSection({
  form,
  onChange,
}: ProfileBillingAddressSectionProps) {
  return (
    <Card className="rounded-3xl border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Endereço de Faturamento</CardTitle>
            <CardDescription className="text-xs">
              Utilizado para emissão fiscal das faturas e recibos de pagamento.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address_line" className="text-xs font-semibold flex items-center gap-1">
              Endereço (Rua, Av, Número) <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Input
              id="address_line"
              value={form.address_line}
              placeholder="Ex: Av. Paulista, 1000"
              onChange={(e) => onChange("address_line", e.target.value)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_line2" className="text-xs font-semibold">
              Complemento
            </Label>
            <Input
              id="address_line2"
              value={form.address_line2 || ""}
              placeholder="Apto, Sala, Bloco"
              onChange={(e) => onChange("address_line2", e.target.value)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city" className="text-xs font-semibold flex items-center gap-1">
              Cidade <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Input
              id="city"
              value={form.city}
              placeholder="Ex: São Paulo"
              onChange={(e) => onChange("city", e.target.value)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state" className="text-xs font-semibold">
              Estado / UF
            </Label>
            <Input
              id="state"
              value={form.state || ""}
              placeholder="Ex: SP"
              onChange={(e) => onChange("state", e.target.value)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postal_code" className="text-xs font-semibold">
              CEP / Código Postal
            </Label>
            <Input
              id="postal_code"
              value={form.postal_code || ""}
              placeholder="00000-000"
              onChange={(e) => onChange("postal_code", e.target.value)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
