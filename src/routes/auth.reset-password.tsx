import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { logSessionEvent } from "@/lib/audit.functions";

export const Route = createFileRoute("/auth/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (password.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      void logSessionEvent({ data: {
        action: "password.changed",
        description: "Senha da conta alterada pelo usuário",
      }});
      toast.success("Senha alterada com sucesso!");
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err.message || "Erro ao alterar senha");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lime-backdrop flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
        <h1 className="text-center text-3xl font-semibold leading-tight">
          Nova <span className="text-brand">Senha.</span>
        </h1>
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Crie uma nova senha para acessar sua conta.
        </p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="h-12 rounded-xl"
              required
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="h-12 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90"
          >
            {busy ? "Alterando..." : "Salvar Nova Senha"}
          </Button>
        </form>
      </div>
    </div>
  );
}
