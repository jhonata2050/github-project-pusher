import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelector } from "@/components/app/CountrySelector";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trackEvent } from "@/lib/analytics";
import { useQueryClient } from "@tanstack/react-query";
import { countries } from "@/lib/countries";

export const Route = createFileRoute("/_authenticated/complete-profile")({
  component: CompleteProfilePage,
});

function CompleteProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const [phone, setPhone] = useState("");
  const [tax_id, setTaxId] = useState("");
  const [identificationType, setIdentificationType] = useState("cpf");
  const [country, setCountry] = useState("BR");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
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
    if (!phone || !tax_id || !country || !city || !addressLine || !leadSource || (leadSource === "Outro" && !leadSourceOther)) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone: phone.trim(),
          tax_id: tax_id.trim(),
          identification_type: identificationType,
          country: country,
          address_line: addressLine.trim(),
          city: city.trim(),
          state: state.trim(),
          postal_code: postalCode.trim(),
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="identificationType">Tipo de Documento</Label>
                <select
                  id="identificationType"
                  value={identificationType}
                  onChange={(e) => setIdentificationType(e.target.value)}
                  className="flex h-12 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="cpf">CPF (Pessoa Física)</option>
                  <option value="cnpj">CNPJ (Empresa)</option>
                  <option value="tax_id">Tax ID (Internacional)</option>
                  <option value="passport">Passaporte</option>
                </select>
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

            <div className="space-y-2">
              <Label htmlFor="addressLine">Endereço</Label>
              <Input
                id="addressLine"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Rua, número, complemento"
                className="h-12 rounded-xl"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="h-12 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">Estado / Província</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="postalCode">CEP / Código Postal</Label>
              <Input
                id="postalCode"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="h-12 rounded-xl"
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
