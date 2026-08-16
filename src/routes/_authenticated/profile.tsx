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
import { useAuth, useProfile } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Meus dados — HostPanel" },
      {
        name: "description",
        content: "Atualize seus dados cadastrais, documento, telefone e endereço de faturamento.",
      },
      { property: "og:title", content: "Meus dados — HostPanel" },
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
  tax_id: z.string().trim().max(20).optional(),
  phone: z.string().trim().max(20).optional(),
  address_line: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  state: z.string().trim().max(40).optional(),
  postal_code: z.string().trim().max(12).optional(),
});

type FormState = Record<keyof z.infer<typeof schema>, string>;

const EMPTY: FormState = {
  full_name: "",
  company_name: "",
  tax_id: "",
  phone: "",
  address_line: "",
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
      phone: profile.phone ?? "",
      address_line: profile.address_line ?? "",
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
          company_name: parsed.company_name || null,
          tax_id: parsed.tax_id || null,
          phone: parsed.phone || null,
          address_line: parsed.address_line || null,
          city: parsed.city || null,
          state: parsed.state || null,
          postal_code: parsed.postal_code || null,
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
        value={form[key]}
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
        {field("tax_id", "CPF/CNPJ")}
        {field("phone", "Telefone")}
        {field("address_line", "Endereço")}
        {field("city", "Cidade")}
        {field("state", "Estado")}
        {field("postal_code", "CEP")}
        <div className="md:col-span-2">
          <Button type="submit" disabled={save.isPending || isLoading} className="h-11 rounded-xl">
            Salvar alterações
          </Button>
        </div>
      </form>
    </AppShell>
  );
}
