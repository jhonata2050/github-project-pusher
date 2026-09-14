import { Building } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CountrySelector } from "@/components/app/CountrySelector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { countries } from "@/lib/countries";
import type { ProfileFormState } from "./types";

interface ProfileIdentitySectionProps {
  form: ProfileFormState;
  onChange: <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => void;
}

export function ProfileIdentitySection({ form, onChange }: ProfileIdentitySectionProps) {
  const currentDdi = countries.find((c) => c.code === form.country)?.ddi || "+55";

  return (
    <Card className="rounded-3xl border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Building className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold">Identificação & Contato</CardTitle>
            <CardDescription className="text-xs">
              Dados do titular da conta e contato principal para notificações.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name" className="text-xs font-semibold flex items-center gap-1">
              Nome completo <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Input
              id="full_name"
              value={form.full_name}
              placeholder="Seu nome ou razão social"
              onChange={(e) => onChange("full_name", e.target.value)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name" className="text-xs font-semibold">
              Empresa (opcional)
            </Label>
            <Input
              id="company_name"
              value={form.company_name || ""}
              placeholder="Nome fantasia ou organização"
              onChange={(e) => onChange("company_name", e.target.value)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="identification_type" className="text-xs font-semibold">
              Tipo de Documento <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Select
              value={form.identification_type}
              onValueChange={(val) => onChange("identification_type", val)}
            >
              <SelectTrigger
                id="identification_type"
                className="h-11 rounded-xl border-input bg-background cursor-pointer shadow-xs text-xs font-medium"
              >
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/40 shadow-xl">
                <SelectItem value="cpf">CPF (Pessoa Física)</SelectItem>
                <SelectItem value="cnpj">CNPJ (Empresa)</SelectItem>
                <SelectItem value="tax_id">Tax ID (Internacional)</SelectItem>
                <SelectItem value="passport">Passaporte</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tax_id" className="text-xs font-semibold flex items-center gap-1">
              Documento (CPF / CNPJ) <span className="text-rose-500 font-bold">*</span>
            </Label>
            <Input
              id="tax_id"
              value={form.tax_id}
              placeholder="000.000.000-00"
              onChange={(e) => onChange("tax_id", e.target.value)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country" className="text-xs font-semibold">
              País de Residência <span className="text-rose-500 font-bold">*</span>
            </Label>
            <CountrySelector
              value={form.country}
              onChange={(val) => onChange("country", val)}
              className="h-11 rounded-xl text-xs font-medium"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs font-semibold">
              Telefone / WhatsApp <span className="text-rose-500 font-bold">*</span>
            </Label>
            <div className="relative">
              <Input
                id="phone"
                value={form.phone}
                placeholder="Número (Ex: 11988887777)"
                onChange={(e) => onChange("phone", e.target.value)}
                className="h-11 rounded-xl pl-14 text-xs font-medium"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
                {currentDdi}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
