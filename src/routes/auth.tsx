import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";
import { logPublicAuthEvent, logSessionEvent } from "@/lib/audit.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar na HostPanel — Painel de hospedagem" },
      {
        name: "description",
        content:
          "Acesse o painel HostPanel para gerenciar sua hospedagem, faturas, serviços e tickets de suporte.",
      },
      { property: "og:title", content: "Entrar na HostPanel" },
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
  .max(72, "A senha deve ter no máximo 72 caracteres");

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
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
    await navigate({ to: "/dashboard" });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsedEmail.data,
          password: parsedPassword.data,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName.trim().slice(0, 120) },
          },
        });
        if (error) throw error;
        if (data.session) void logSessionEvent({ data: { action: "signup.succeeded", description: "Conta criada com sucesso" } });
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        await navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsedEmail.data,
          password: parsedPassword.data,
        });
        if (error) throw error;
        await navigate({ to: "/dashboard" });
      }
    } catch (error) {
      void logPublicAuthEvent({ data: {
        action: mode === "signup" ? "signup.failed" : "login.failed",
        email: parsedEmail.data,
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
            <h1 className="text-center text-3xl font-semibold leading-tight">
              Boas vindas a <span className="text-brand">HostPanel.</span>
            </h1>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Gerencie sua hospedagem, faturas e suporte em um só lugar. Sem burocracia.
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
