import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { trackEvent } from "@/lib/analytics";
import { countries } from "@/lib/countries";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelector } from "@/components/app/CountrySelector";
import { useAuth, useIsStaff } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { logPublicAuthEvent, logSessionEvent } from "@/lib/audit.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search['redirect'] as string) || undefined,
    } as { redirect?: string };
  },
  head: () => ({
    meta: [
      { title: "Entrar na Eqsam — Painel de hospedagem" },
      {
        name: "description",
        content:
          "Acesse o painel Eqsam para gerenciar sua hospedagem, faturas, serviços e tickets de suporte.",
      },
      { property: "og:title", content: "Entrar na Eqsam" },
      {
        property: "og:description",
        content: "Acesse o painel para gerenciar hospedagem, faturas e suporte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Informe um e-mail válido").max(255);
const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
  .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
  .regex(/[0-9]/, "Deve conter pelo menos um número")
  .regex(/[^A-Za-z0-9]/, "Deve conter pelo menos um caractere especial")
  .max(72, "A senha deve ter no máximo 72 caracteres");

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome").max(120),
  phone: z.string().trim().min(5, "Telefone inválido").max(20),
  tax_id: z.string().trim().min(5, "Documento de identificação é obrigatório").max(30),
  identification_type: z.string().min(1, "Selecione o tipo de identificação"),
  country: z.string().min(2, "Selecione o país"),
  email: emailSchema,
  password: passwordSchema,
  leadSource: z.string().min(1, "Selecione como nos conheceu"),
  leadSourceOther: z.string().optional(),
});


function AuthPage() {
  const navigate = useNavigate();
  const { redirect } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const branding = useBranding();
  const { isStaff, isLoading: staffLoading } = useIsStaff();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [tax_id, setTaxId] = useState("");
  const [identificationType, setIdentificationType] = useState("cpf");
  const [country, setCountry] = useState("BR");
  const [leadSource, setLeadSource] = useState("");
  const [leadSourceOther, setLeadSourceOther] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);


  const loading = authLoading || (!!user && staffLoading);

  useEffect(() => {
    if (!loading && user) {
      console.log("[Auth] User logged in:", user.id, "isStaff:", isStaff, "redirect:", redirect);
      const defaultDest = isStaff ? "/admin" : "/dashboard";
      const destination = (redirect as string) || defaultDest;
      console.log("[Auth] Navigating to:", destination);
      
      // Use replace: true to avoid auth page in history
      void navigate({ to: destination as any, replace: true });
    }
  }, [loading, user, isStaff, navigate, redirect]);

  async function handleGoogle() {
    setBusy(true);
    // Preservar o redirecionamento original se houver
    const searchParams = new URLSearchParams();
    if (redirect) searchParams.set("redirect", redirect);
    
    const callbackUrl = `${window.location.origin}/auth?${searchParams.toString()}`;

    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: callbackUrl,
    });
    if (result.error) {
      void logPublicAuthEvent({ data: {
        action: "login.failed",
        description: "Falha ao entrar com Google",
      }});
      setBusy(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    
    if (mode === "signup") {
      const result = signupSchema.safeParse({
        fullName,
        phone,
        tax_id,
        identification_type: identificationType,
        country,
        email,
        password,
        leadSource,
        leadSourceOther: leadSource === "Outro" ? leadSourceOther : undefined,
      });
      if (!result.success) {
        toast.error(result.error.issues[0]!.message);
        return;
      }
    } else {
      const parsedEmail = emailSchema.safeParse(email);
      if (!parsedEmail.success) {
        toast.error(parsedEmail.error.issues[0]!.message);
        return;
      }
      const parsedPassword = passwordSchema.safeParse(password);
      if (!parsedPassword.success) {
        toast.error(parsedPassword.error.issues[0]!.message);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { 
              full_name: fullName.trim().slice(0, 120),
              phone: phone.trim(),
              tax_id: tax_id.trim(),
              identification_type: identificationType,
              country: country,
              lead_source: leadSource,
              lead_source_other: leadSource === "Outro" ? leadSourceOther : null,
              registration_completed: true
            },
          },
        });
        if (error) throw error;
        if (data.session) {
          void logSessionEvent({ data: { action: "signup.succeeded", description: "Conta criada com sucesso" } });
          trackEvent("sign_up", { method: "email", lead_source: leadSource });
        }

        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        // O useEffect acima cuidará do redirecionamento após a sessão ser injetada
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      void logPublicAuthEvent({ data: {
        action: mode === "signup" ? "signup.failed" : "login.failed",
        email: email.trim(),
        description: mode === "signup" ? "Falha ao criar conta" : "Tentativa de acesso recusada",
      }});
      toast.error(error instanceof Error ? error.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lime-backdrop flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <div className="flex justify-center mb-8">
          {branding.logo_url ? (
            <img
              src={branding.logo_url}
              alt={branding.app_name}
              className="h-10 w-auto max-w-[180px] object-contain"
            />
          ) : (
            <span className="text-2xl font-bold text-brand">{branding.app_name}</span>
          )}
        </div>
        {checkEmail ? (
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-semibold">Confirme seu e-mail</h1>
            <p className="text-sm text-muted-foreground">
              Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele para ativar sua conta
              e acessar o painel.
            </p>
            <Button variant="outline" className="w-full" onClick={() => setCheckEmail(false)}>
              Voltar
            </Button>
          </div>
        ) : (
          <>
            <p className="-mt-2 mb-6 text-center text-sm text-muted-foreground">
              O seu Data Center de serviços Cloud
            </p>

            <Button
              variant="outline"
              className="mt-6 h-12 w-full rounded-xl text-base"
              onClick={handleGoogle}
              disabled={busy}
            >
              <GoogleIcon />
              Entrar com o Google
            </Button>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 border-t border-dashed border-border" />
              <span className="text-xs text-muted-foreground">ou entre com e-mail</span>
              <span className="h-px flex-1 border-t border-dashed border-border" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome"
                    maxLength={120}
                    className="h-12 rounded-xl"
                  />
                </div>
              )}
              {mode === "signup" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="country">País</Label>
                    <CountrySelector
                      value={country}
                      onChange={(val) => {
                        setCountry(val);
                        const selectedCountry = countries.find(c => c.code === val);
                        if (selectedCountry && !phone.startsWith('+')) {
                          setPhone(selectedCountry.ddi + " ");
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+55 (00) 00000-0000"
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>
              )}
              {mode === "signup" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="identificationType">Tipo de Documento</Label>
                    <Select
                      value={identificationType}
                      onValueChange={(val) => setIdentificationType(val)}
                    >
                      <SelectTrigger id="identificationType" className="h-12 rounded-xl border-input bg-background">
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
                    <Label htmlFor="tax_id">Documento (ID)</Label>
                    <Input
                      id="tax_id"
                      value={tax_id}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder={identificationType === 'cpf' ? "000.000.000-00" : "Número do documento"}
                      className="h-12 rounded-xl"
                      required
                    />
                  </div>
                </div>
              )}
              {mode === "signup" && (
                <div className="space-y-2">
                  <Label htmlFor="leadSource">Como nos conheceu?</Label>
                  <Select
                    value={leadSource}
                    onValueChange={(val) => setLeadSource(val)}
                  >
                    <SelectTrigger id="leadSource" className="h-12 rounded-xl border-input bg-background">
                      <SelectValue placeholder="Selecione uma opção" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/40 shadow-xl">
                      <SelectItem value="Google">Google</SelectItem>
                      <SelectItem value="Facebook">Facebook</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="TikTok">TikTok</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              {mode === "signup" && leadSource === "Outro" && (
                <div className="space-y-2">
                  <Label htmlFor="leadSourceOther">Especifique</Label>
                  <Input
                    id="leadSourceOther"
                    value={leadSourceOther}
                    onChange={(e) => setLeadSourceOther(e.target.value)}
                    placeholder="Ex: Blog, Podcast..."
                    className="h-12 rounded-xl"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail de acesso</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@exemplo.com"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <button
                  type="button"
                  className="text-left text-xs text-brand hover:underline"
                  onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                >
                  {mode === "signup" ? "Já tem conta? Entrar" : "Criar uma conta"}
                </button>
                <button
                  type="button"
                  className="text-left sm:text-right text-xs text-muted-foreground hover:text-brand hover:underline transition-colors"
                  onClick={() => {
                    if (!email) {
                      toast.error("Informe seu e-mail para recuperar a senha");
                      return;
                    }
                    const promise = fetch("/api/public/password-reset", {
                      method: "POST",
                      body: JSON.stringify({ email }),
                    });
                    toast.promise(promise, {
                      loading: "Enviando link de recuperação...",
                      success: "Se o e-mail estiver cadastrado, você receberá um link em breve.",
                      error: "Erro ao solicitar recuperação",
                    });
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
              <Button
                type="submit"
                disabled={busy}
                className="h-12 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
              >
                {mode === "signup" ? "Criar minha conta" : "Entrar"}
              </Button>
            </form>

          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.5-3.5A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
