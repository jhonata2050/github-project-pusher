import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth, useIsStaff } from "@/hooks/use-auth";
import { useBranding } from "@/hooks/use-branding";
import {
  AuthDesktopBanner,
  AuthMobileBanner,
  AuthLogo,
  CheckEmailView,
  AuthForm,
  useAuthForm,
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

  const form = useAuthForm({ initialMode, redirect });
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

          {form.checkEmail ? (
            <CheckEmailView email={form.email} onBack={() => form.setCheckEmail(false)} />
          ) : (
            <AuthForm
              mode={form.mode}
              setMode={form.setMode}
              email={form.email}
              setEmail={form.setEmail}
              password={form.password}
              setPassword={form.setPassword}
              fullName={form.fullName}
              setFullName={form.setFullName}
              phone={form.phone}
              setPhone={form.setPhone}
              tax_id={form.tax_id}
              setTaxId={form.setTaxId}
              identificationType={form.identificationType}
              setIdentificationType={form.setIdentificationType}
              country={form.country}
              setCountry={form.setCountry}
              leadSource={form.leadSource}
              setLeadSource={form.setLeadSource}
              leadSourceOther={form.leadSourceOther}
              setLeadSourceOther={form.setLeadSourceOther}
              busy={form.busy}
              onGoogleAuth={form.handleGoogle}
              onSubmit={form.handleSubmit}
            />
          )}
        </div>
      </div>
    </div>
  );
}
