import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import {
  profileSchema,
  EMPTY_PROFILE_FORM,
  type ProfileFormState,
  ProfileIdentitySection,
  ProfileBillingAddressSection,
  ProfileAccountSummaryCard,
  ProfileThemeSelector,
} from "@/components/profile";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Meus dados — Eqsam" },
      {
        name: "description",
        content:
          "Atualize seus dados cadastrais, documento, telefone e endereço de faturamento.",
      },
      { property: "og:title", content: "Meus dados — Eqsam" },
      {
        property: "og:description",
        content: "Atualize seus dados cadastrais e de faturamento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProfileFormState>(EMPTY_PROFILE_FORM);

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
    mutationFn: async (values: ProfileFormState) => {
      const parsed = profileSchema.parse(values);
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: parsed.full_name,
          company_name: parsed.company_name ?? null,
          tax_id: parsed.tax_id ?? null,
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
      toast.success("Dados cadastrais atualizados com sucesso!");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error) => {
      toast.error(
        error instanceof z.ZodError
          ? error.issues[0]!.message
          : error instanceof Error
          ? error.message
          : "Não foi possível salvar os dados."
      );
    },
  });

  const handleFormChange = <K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Meus dados cadastrais
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Essas informações aparecem nas suas faturas, notas de cobrança e
              identificação do titular.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="px-3 py-1 rounded-full text-xs gap-1.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Conta Ativa
            </Badge>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna Principal: Formulários (2/3 da largura) */}
            <div className="lg:col-span-2 space-y-6">
              <ProfileIdentitySection form={form} onChange={handleFormChange} />
              <ProfileBillingAddressSection
                form={form}
                onChange={handleFormChange}
              />

              {/* Botão de Ação Salvar */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={save.isPending || isLoading}
                  className="h-11 px-6 rounded-xl font-bold text-xs gap-2 shadow-sm"
                >
                  {save.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando dados...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Salvar alterações
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Coluna Lateral: Resumo, Aparência & Atalhos (1/3 da largura) */}
            <div className="space-y-6">
              <ProfileAccountSummaryCard
                fullName={profile?.full_name}
                email={user?.email}
                userId={user?.id}
                balance={profile?.account_balance}
              />
              <ProfileThemeSelector theme={theme} onThemeChange={setTheme} />
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
