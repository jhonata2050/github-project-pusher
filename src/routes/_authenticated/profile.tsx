import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelector } from "@/components/app/CountrySelector";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/lib/countries";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Meus dados — Eqsam" },
      {
        name: "description",
        content: "Atualize seus dados cadastrais, documento, telefone e endereço de faturamento.",
      },
      { property: "og:title", content: "Meus dados — Eqsam" },
      { property: "og:description", content: "Atualize seus dados cadastrais e de faturamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "Informe seu nome").max(120),
  company_name: z.string().trim().max(120).optional(),
  tax_id: z.string().trim().min(5, "Documento obrigatório").max(30),
  identification_type: z.string().min(1, "Selecione o tipo de identificação"),
  country: z.string().min(2, "Selecione o país"),
  phone: z.string().trim().min(5, "Telefone inválido").max(20),
  address_line: z.string().trim().min(2, "Endereço obrigatório").max(160),
  address_line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2, "Cidade obrigatória").max(80),
  state: z.string().trim().max(40).optional(),
  postal_code: z.string().trim().max(20).optional(),
});

type FormState = z.infer<typeof schema>;

const EMPTY: FormState = {
  full_name: "",
  company_name: "",
  tax_id: "",
  identification_type: "cpf",
  country: "BR",
  phone: "",
  address_line: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
};

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY);

  useEffect(() => {
    if (!profile) return;
    setForm({
      full_name: profile.full_name ?? "",
      company_name: profile.company_name ?? "",
      tax_id: profile.tax_id ?? "",
      identification_type: (profile as any).identification_type ?? "cpf",
      country: (profile as any).country ?? "BR",
      phone: profile.phone ?? "",
      address_line: profile.address_line ?? "",
      address_line2: (profile as any).address_line2 ?? "",
      city: profile.city ?? "",
      state: profile.state ?? "",
      postal_code: profile.postal_code ?? "",
    });
  }, [profile]);

  const save = useMutation({
    mutationFn: async (values: FormState) => {
      const parsed = schema.parse(values);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.full_name,
          company_name: parsed.company_name ?? null,
          tax_id: parsed.tax_id ?? null,
          identification_type: parsed.identification_type as any,
          country: parsed.country as any,
          phone: parsed.phone ?? null,
          address_line: parsed.address_line ?? null,
          address_line2: parsed.address_line2 ?? null,
          city: parsed.city ?? null,
          state: parsed.state ?? null,
          postal_code: parsed.postal_code ?? null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados atualizados.");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof z.ZodError
          ? error.issues[0]!.message
          : error instanceof Error
            ? error.message
            : "Não foi possível salvar.",
      );
    },
  });

  const field = (key: keyof FormState, label: string, placeholder?: string) => (
    <div className="space-y-2">
      <Label htmlFor={key}>{label}</Label>
      <Input
        id={key}
        value={(form as any)[key] ?? ""}
        placeholder={placeholder ?? ""}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        className="h-11 rounded-xl"
      />
    </div>
  );

  return (
    <AppShell
      area="client"
      breadcrumb={
        <span className="flex items-center gap-2 text-base font-medium text-foreground">
          <UserIcon className="size-4" />
          Meus dados
        </span>
      }
    >
      <h1 className="text-2xl font-semibold tracking-tight">Dados cadastrais</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Essas informações aparecem nas suas faturas e notas de cobrança.
      </p>

      <form
        className="mt-6 grid max-w-3xl gap-4 grid-cols-1 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(form);
        }}
      >
        {field("full_name", "Nome completo")}
        {field("company_name", "Empresa (opcional)")}
        
        <div className="space-y-2">
          <Label htmlFor="identification_type">Tipo de Documento</Label>
          <Select
            value={form.identification_type}
            onValueChange={(val) => setForm((prev) => ({ ...prev, identification_type: val }))}
          >
            <SelectTrigger id="identification_type" className="h-11 rounded-xl border-input bg-background cursor-pointer shadow-sm">
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
        {field("tax_id", "Documento (ID)")}

        <div className="space-y-2">
          <Label htmlFor="country">País</Label>
          <CountrySelector
            value={form.country}
            onChange={(val) => setForm((prev) => ({ ...prev, country: val }))}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <div className="relative">
            <Input
              id="phone"
              value={form.phone ?? ""}
              placeholder="Número (Ex: 11988887777)"
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="h-11 rounded-xl pl-12"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
              {countries.find(c => c.code === form.country)?.ddi}
            </span>
          </div>
        </div>

        {field("address_line", "Endereço (Rua, nº)")}
        {field("address_line2", "Complemento (opcional)")}
        {field("city", "Cidade")}
        {field("state", "Estado / Província")}
        {field("postal_code", "CEP / Código Postal")}
        <div className="md:col-span-2">
          <Button type="submit" disabled={save.isPending || isLoading} className="h-11 rounded-xl">
            Salvar alterações
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
