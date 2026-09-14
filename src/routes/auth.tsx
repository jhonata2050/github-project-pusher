import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth, useIsStaff } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { logPublicAuthEvent, logSessionEvent } from "@/lib/audit.functions";
import {
  AuthDesktopBanner,
  AuthMobileBanner,
  AuthLogo,
  GoogleAuthButton,
  SignupFields,
  CheckEmailView,
  ForgotPasswordTrigger,
  emailSchema,
  passwordSchema,
  signupSchema,
  type AuthMode,
} from "@/components/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      redirect: (search['redirect'] as string) || undefined,
      mode: (search['mode'] as string) || undefined,
    } as { redirect?: string; mode?: string };
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

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, mode: searchMode } = Route.useSearch();
  const { user, loading: authLoading } = useAuth();
  const branding = useBranding();
  const { isStaff, isLoading: staffLoading } = useIsStaff();

  // Se estiver vindo de um link de checkout ou com mode=signup, abrir no cadastro
  const initialMode =
    searchMode === "signup" || redirect?.includes("/checkout/")
      ? "signup"
      : "signin";

  const [mode, setMode] = useState<AuthMode>(initialMode);
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
      let destination = (redirect as string) || defaultDest;

      // Sanitização básica para evitar loops ou redirecionamentos maliciosos
      if (destination.includes("/auth")) destination = defaultDest;

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
      void logPublicAuthEvent({
        data: {
          action: "login.failed",
          description: "Falha ao entrar com Google",
        },
      });
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
              registration_completed: true,
            },
          },
        });
        if (error) throw error;
        if (data.session && data.user) {
          try {
            await supabase.from("profiles").update({
              phone: phone.trim() || null,
              tax_id: tax_id.trim() || null,
              country: country || "BR",
              full_name: fullName.trim().slice(0, 120),
            }).eq("id", data.user.id);
          } catch (pErr) {
            console.warn("[SignUp] Aviso ao atualizar dados complementares do perfil:", pErr);
          }
          void logSessionEvent({
            data: { action: "signup.succeeded", description: "Conta criada com sucesso" },
          });
          trackEvent("sign_up", { method: "email", lead_source: leadSource });
        }

        if (!data.session) {
          setCheckEmail(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      }
    } catch (error) {
      void logPublicAuthEvent({
        data: {
          action: mode === "signup" ? "signup.failed" : "login.failed",
          email: email.trim(),
          description:
            mode === "signup"
              ? "Falha ao criar conta"
              : "Tentativa de acesso recusada",
        },
      });
      toast.error(
        error instanceof Error ? error.message : "Não foi possível continuar."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lime-backdrop flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-5xl rounded-3xl border border-border bg-card shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Banner Lateral no Desktop */}
        <AuthDesktopBanner />

        {/* Coluna do Formulário */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-center bg-card">
          {/* Banner no Mobile */}
          <AuthMobileBanner />

          {/* Logo da Aplicação */}
          <AuthLogo logoUrl={branding.logo_url} appName={branding.app_name} />

          {checkEmail ? (
            <CheckEmailView email={email} onBack={() => setCheckEmail(false)} />
          ) : (
            <>
              <p className="-mt-2 mb-6 text-center text-xs text-muted-foreground">
                {mode === "signup"
                  ? "Crie sua conta para começar agora"
                  : "O seu Data Center de serviços Cloud"}
              </p>

              <GoogleAuthButton onClick={handleGoogle} disabled={busy} />

              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 border-t border-dashed border-border" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  ou com seu e-mail
                </span>
                <span className="h-px flex-1 border-t border-dashed border-border" />
              </div>

              <form className="space-y-3.5" onSubmit={handleSubmit}>
                {mode === "signup" && (
                  <SignupFields
                    fullName={fullName}
                    setFullName={setFullName}
                    country={country}
                    setCountry={setCountry}
                    phone={phone}
                    setPhone={setPhone}
                    identificationType={identificationType}
                    setIdentificationType={setIdentificationType}
                    tax_id={tax_id}
                    setTaxId={setTaxId}
                    leadSource={leadSource}
                    setLeadSource={setLeadSource}
                    leadSourceOther={leadSourceOther}
                    setLeadSourceOther={setLeadSourceOther}
                  />
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">
                    E-mail de acesso
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@exemplo.com"
                    className="h-11 rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 rounded-xl text-xs"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center pt-1">
                  <button
                    type="button"
                    className="text-left text-xs font-semibold text-brand hover:underline"
                    onClick={() =>
                      setMode(mode === "signup" ? "signin" : "signup")
                    }
                  >
                    {mode === "signup"
                      ? "Já tem conta? Entrar"
                      : "Criar uma conta gratuita"}
                  </button>
                  <ForgotPasswordTrigger email={email} />
                </div>

                <Button
                  type="submit"
                  disabled={busy}
                  className="h-11 w-full rounded-xl bg-foreground text-sm font-semibold text-background hover:bg-foreground/90 mt-2"
                >
                  {mode === "signup" ? "Criar minha conta" : "Entrar no Painel"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
