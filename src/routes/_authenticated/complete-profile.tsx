import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/complete-profile")({
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [phone, setPhone] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [leadSourceOther, setLeadSourceOther] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      // Se o usuário já tiver os dados, redireciona para o dashboard
      const checkProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("phone, lead_source, registration_completed")
          .eq("id", user.id)
          .single();
        
        if (data?.phone && data?.lead_source && data?.registration_completed) {
          navigate({ to: "/dashboard" });
        }
      };
      checkProfile();
    }
  }, [user, authLoading, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !leadSource || (leadSource === "Outro" && !leadSourceOther)) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone: phone.trim(),
          lead_source: leadSource,
          lead_source_other: leadSource === "Outro" ? leadSourceOther : null,
          registration_completed: true,
        })
        .eq("id", user!.id);

      if (error) throw error;

      trackEvent("sign_up", { method: "oauth_complete", lead_source: leadSource });
      
      // Invalida o cache do perfil e aguarda a sincronização antes de navegar
      await queryClient.invalidateQueries({ queryKey: ["profile", user!.id] });
      
      toast.success("Cadastro finalizado com sucesso!");
      navigate({ to: "/dashboard" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao finalizar cadastro.");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;

  return (
    <div className="lime-backdrop flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md rounded-3xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Quase lá!</CardTitle>
          <CardDescription>Precisamos de mais algumas informações para concluir seu cadastro.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="h-12 rounded-xl"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="leadSource">Como nos conheceu?</Label>
              <select
                id="leadSource"
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              >
                <option value="">Selecione uma opção</option>
                <option value="Google">Google</option>
                <option value="Facebook">Facebook</option>
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="Indicação">Indicação</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {leadSource === "Outro" && (
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

            <Button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-xl bg-foreground text-base text-background hover:bg-foreground/90 mt-4"
            >
              Finalizar Cadastro
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
