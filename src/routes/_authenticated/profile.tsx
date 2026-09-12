import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User as UserIcon,
  Sun,
  Moon,
  Monitor,
  MapPin,
  Building,
  Wallet,
  ShieldCheck,
  Mail,
  Plus,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CountrySelector } from "@/components/app/CountrySelector";
import { useAuth, useProfile } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { supabase } from "@/integrations/supabase/client";
import { countries } from "@/lib/countries";
import { cn } from "@/lib/utils";
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
  const { theme, setTheme } = useTheme();
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
            : "Não foi possível salvar os dados.",
      );
    },
  });

  const field = (key: keyof FormState, label: string, placeholder?: string, isRequired = false) => (
    <div className="space-y-2">
      <Label htmlFor={key} className="text-xs font-semibold flex items-center gap-1">
        {label} {isRequired && <span className="text-rose-500 font-bold">*</span>}
      </Label>
      <Input
        id={key}
        value={(form as any)[key] ?? ""}
        placeholder={placeholder ?? ""}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
        className="h-11 rounded-xl text-xs font-medium"
      />
    </div>
  );

  const userInitials = (profile?.full_name || user?.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const formattedBalance = Number(profile?.account_balance || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Meus dados cadastrais</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Essas informações aparecem nas suas faturas, notas de cobrança e identificação do titular.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1 rounded-full text-xs gap-1.5 border-emerald-500/30 text-emerald-500 bg-emerald-500/5">
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
              {/* Card 1: Informações Pessoais & Documento */}
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
                    {field("full_name", "Nome completo", "Seu nome ou razão social", true)}
                    {field("company_name", "Empresa (opcional)", "Nome fantasia ou organização")}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="identification_type" className="text-xs font-semibold">
                        Tipo de Documento <span className="text-rose-500 font-bold">*</span>
                      </Label>
                      <Select
                        value={form.identification_type}
                        onValueChange={(val) => setForm((prev) => ({ ...prev, identification_type: val }))}
                      >
                        <SelectTrigger id="identification_type" className="h-11 rounded-xl border-input bg-background cursor-pointer shadow-xs text-xs font-medium">
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

                    {field("tax_id", "Documento (CPF / CNPJ)", "000.000.000-00", true)}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-xs font-semibold">
                        País de Residência <span className="text-rose-500 font-bold">*</span>
                      </Label>
                      <CountrySelector
                        value={form.country}
                        onChange={(val) => setForm((prev) => ({ ...prev, country: val }))}
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
                          value={form.phone ?? ""}
                          placeholder="Número (Ex: 11988887777)"
                          onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                          className="h-11 rounded-xl pl-14 text-xs font-medium"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border">
                          {countries.find((c) => c.code === form.country)?.ddi || "+55"}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card 2: Endereço de Faturamento */}
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
                    <div className="sm:col-span-2">
                      {field("address_line", "Endereço (Rua, Av, Número)", "Ex: Av. Paulista, 1000", true)}
                    </div>
                    <div>
                      {field("address_line2", "Complemento", "Apto, Sala, Bloco")}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>{field("city", "Cidade", "Ex: São Paulo", true)}</div>
                    <div>{field("state", "Estado / UF", "Ex: SP")}</div>
                    <div>{field("postal_code", "CEP / Código Postal", "00000-000")}</div>
                  </div>
                </CardContent>
              </Card>

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
              {/* Card: Resumo da Conta */}
              <Card className="rounded-3xl border shadow-sm overflow-hidden">
                <div className="p-6 bg-muted/40 border-b flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground font-black text-xl flex items-center justify-center shadow-sm flex-shrink-0">
                    {userInitials}
                  </div>
                  <div className="overflow-hidden min-w-0">
                    <h3 className="font-bold text-sm truncate text-foreground">
                      {profile?.full_name || "Cliente Eqsam"}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Mail className="h-3 w-3 flex-shrink-0" />
                      {user?.email || "cliente@eqsam.com"}
                    </p>
                  </div>
                </div>

                <CardContent className="p-5 space-y-4">
                  {/* Box de Saldo em Carteira */}
                  <div className="p-4 rounded-2xl border bg-card/60 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Wallet className="h-3.5 w-3.5 text-primary" /> Saldo Disponível
                      </span>
                      <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/20 bg-primary/5">
                        Pré-pago
                      </Badge>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-black text-foreground">
                        R$ {formattedBalance}
                      </span>
                      <Link to="/invoices">
                        <Button variant="ghost" size="sm" className="h-7 text-[11px] font-bold text-primary hover:text-primary gap-1 px-2 rounded-lg">
                          <Plus className="h-3 w-3" /> Recarregar
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between py-1 border-b border-border/50">
                      <span>ID da Conta:</span>
                      <span className="font-mono text-[11px] text-foreground font-semibold">
                        {(user?.id || "").slice(0, 12)}...
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span>Status do Cadastro:</span>
                      <span className="font-bold text-emerald-500 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verificado
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Card: Aparência do Painel */}
              <Card className="rounded-3xl border shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <CardTitle className="text-sm font-bold">Aparência do Painel</CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    Escolha a paleta de cores para navegar no sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
                      theme === "light"
                        ? "border-primary bg-primary/5 text-foreground font-bold shadow-xs ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/30 bg-card text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                        <Sun className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Modo Claro</p>
                        <p className="text-[11px] text-muted-foreground">Fundo branco e limpo</p>
                      </div>
                    </div>
                    {theme === "light" && <Badge className="text-[10px] h-5 px-1.5">Ativo</Badge>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
                      theme === "dark"
                        ? "border-primary bg-primary/5 text-foreground font-bold shadow-xs ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/30 bg-card text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                        <Moon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Modo Escuro (Terminal)</p>
                        <p className="text-[11px] text-muted-foreground">Fundo preto #000606</p>
                      </div>
                    </div>
                    {theme === "dark" && <Badge className="text-[10px] h-5 px-1.5">Ativo</Badge>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
                      theme === "system"
                        ? "border-primary bg-primary/5 text-foreground font-bold shadow-xs ring-1 ring-primary"
                        : "border-border hover:border-muted-foreground/30 bg-card text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-muted text-muted-foreground">
                        <Monitor className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Sistema</p>
                        <p className="text-[11px] text-muted-foreground">Acompanha seu dispositivo</p>
                      </div>
                    </div>
                    {theme === "system" && <Badge className="text-[10px] h-5 px-1.5">Ativo</Badge>}
                  </button>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
