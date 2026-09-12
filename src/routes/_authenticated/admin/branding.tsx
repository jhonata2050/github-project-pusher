import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Save, Upload, Type, Paintbrush, Globe, CheckCircle2, AlertCircle, Pipette } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBranding, updateBranding, type BrandingSettings } from "@/lib/admin.functions";
import { applyBrandingToDom } from "@/hooks/use-branding";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  component: BrandingSettingsPage,
});

const PRESETS = [
  { label: "Verde Lima", color: "#a3e635", brand: "#10b981" },
  { label: "Azul Safira", color: "#3B82F6", brand: "#2563EB" },
  { label: "Roxo Real", color: "#8B5CF6", brand: "#7C3AED" },
  { label: "Esmeralda", color: "#10B981", brand: "#059669" },
  { label: "Laranja Âmbar", color: "#F59E0B", brand: "#D97706" },
  { label: "Vermelho Rubi", color: "#EF4444", brand: "#DC2626" },
  { label: "Rosa Terracota", color: "#b2646f", brand: "#c75931" },
];

function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const { data: branding, isLoading } = useQuery({
    queryKey: ["branding-admin"],
    queryFn: () => getBranding(),
  });

  const [form, setForm] = useState<BrandingSettings>({
    logo_url: "",
    app_name: "Eqsam",
    primary_color: "#3B82F6",
    brand_color: "#3B82F6",
    favicon_url: "",
  });

  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (branding) {
      const updated = {
        ...branding,
        logo_url: branding.logo_url || "",
        favicon_url: branding.favicon_url || "",
      };
      setForm(updated);
      applyBrandingToDom(updated);
    }
  }, [branding]);

  const mutation = useMutation({
    mutationFn: (data: BrandingSettings) => updateBranding({ data: { data } }),
    onSuccess: () => {
      toast.success("Configurações e cores salvas com sucesso!");
      applyBrandingToDom(form);
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      queryClient.invalidateQueries({ queryKey: ["branding-admin"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(type);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-${Math.random()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      setForm(prev => ({
        ...prev,
        [type === 'logo' ? 'logo_url' : 'favicon_url']: publicUrl
      }));
      
      toast.success(`${type === 'logo' ? 'Logo' : 'Favicon'} carregado com sucesso!`);
    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) {
    return (
      <AppShell area="admin" breadcrumb={<span>Branding e Visual</span>}>
        <div className="mt-6 space-y-6 animate-pulse">
          <div className="h-40 bg-muted rounded-3xl" />
          <div className="h-96 bg-muted rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <span className="flex items-center gap-2 font-medium text-foreground">
          <Palette className="size-4" />
          Branding e Visual
        </span>
      }
    >
      <div className="mt-6 flex flex-col gap-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personalização da Marca</h1>
          <p className="text-muted-foreground mt-1">
            Configure a identidade visual da plataforma EQSAM CLOUD para seus clientes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 pb-12">
          <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Type className="size-5 text-primary" /> Identidade Básica
              </CardTitle>
              <CardDescription>Nome da plataforma e logotipos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="app_name">Nome do Sistema</Label>
                <Input
                  id="app_name"
                  value={form.app_name}
                  onChange={e => setForm(v => ({ ...v, app_name: e.target.value }))}
                  className="rounded-xl"
                  placeholder="Ex: Minha Hospedagem"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label>Logo Principal</Label>
                  <div className="border-2 border-dashed border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-4 bg-muted/20">
                    {form.logo_url ? (
                      <div className="relative group">
                        <img src={form.logo_url} alt="Logo Preview" className="h-12 w-auto object-contain" />
                        <button 
                          type="button"
                          onClick={() => setForm(v => ({ ...v, logo_url: "" }))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <AlertCircle className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Upload className="size-8" />
                        <span className="text-xs">PNG ou SVG recomendado</span>
                      </div>
                    )}
                    <div className="w-full space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="URL da imagem ou use o botão ao lado"
                          value={form.logo_url || ""}
                          onChange={e => setForm(v => ({ ...v, logo_url: e.target.value }))}
                          className="rounded-xl text-xs h-9"
                        />
                        <Label htmlFor="logo-upload" className="shrink-0 cursor-pointer">
                          <div className="flex items-center justify-center px-3 h-9 border border-input bg-background hover:bg-accent rounded-xl transition-colors text-xs font-medium">
                            {uploading === 'logo' ? "Enviando..." : "Upload"}
                          </div>
                        </Label>
                        <Input 
                          id="logo-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={e => handleFileUpload(e, 'logo')}
                          disabled={!!uploading}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Favicon</Label>
                  <div className="border-2 border-dashed border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-4 bg-muted/20">
                    {form.favicon_url ? (
                      <div className="relative group">
                        <img src={form.favicon_url} alt="Favicon Preview" className="size-8 object-contain" />
                        <button 
                          type="button"
                          onClick={() => setForm(v => ({ ...v, favicon_url: "" }))}
                          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <AlertCircle className="size-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Globe className="size-8" />
                        <span className="text-xs">ICO ou PNG (32x32)</span>
                      </div>
                    )}
                    <div className="w-full space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="URL do Favicon ou use o botão ao lado"
                          value={form.favicon_url || ""}
                          onChange={e => setForm(v => ({ ...v, favicon_url: e.target.value }))}
                          className="rounded-xl text-xs h-9"
                        />
                        <Label htmlFor="favicon-upload" className="shrink-0 cursor-pointer">
                          <div className="flex items-center justify-center px-3 h-9 border border-input bg-background hover:bg-accent rounded-xl transition-colors text-xs font-medium">
                            {uploading === 'favicon' ? "Enviando..." : "Upload"}
                          </div>
                        </Label>
                        <Input 
                          id="favicon-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={e => handleFileUpload(e, 'favicon')}
                          disabled={!!uploading}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="size-5 text-primary" /> Paleta de Cores
              </CardTitle>
              <CardDescription>Defina as cores predominantes do sistema e dos clientes com visualização em tempo real.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="primary_color" className="text-sm font-semibold">
                    Cor Primária (OKLCH ou Hex)
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="relative size-11 shrink-0 rounded-2xl overflow-hidden border border-border shadow-sm cursor-pointer group">
                      <div 
                        className="size-full transition-colors flex items-center justify-center"
                        style={{ backgroundColor: form.primary_color }}
                      >
                        <Pipette className="size-4 text-white drop-shadow opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <input
                        type="color"
                        value={form.primary_color.startsWith('#') && form.primary_color.length === 7 ? form.primary_color : '#3b82f6'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm(v => ({ ...v, primary_color: val }));
                          applyBrandingToDom({ ...form, primary_color: val });
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Clique para abrir seletor de cores"
                      />
                    </div>
                    <Input
                      id="primary_color"
                      value={form.primary_color}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(v => ({ ...v, primary_color: val }));
                        applyBrandingToDom({ ...form, primary_color: val });
                      }}
                      className="rounded-xl font-mono text-sm h-11"
                      placeholder="Ex: #3B82F6 ou oklch(0.88 0.19 128)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Utilizada em botões principais, destaques e estados ativos.</p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="brand_color" className="text-sm font-semibold">
                    Cor da Marca (OKLCH ou Hex)
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="relative size-11 shrink-0 rounded-2xl overflow-hidden border border-border shadow-sm cursor-pointer group">
                      <div 
                        className="size-full transition-colors flex items-center justify-center"
                        style={{ backgroundColor: form.brand_color }}
                      >
                        <Pipette className="size-4 text-white drop-shadow opacity-70 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <input
                        type="color"
                        value={form.brand_color.startsWith('#') && form.brand_color.length === 7 ? form.brand_color : '#10b981'}
                        onChange={(e) => {
                          const val = e.target.value;
                          setForm(v => ({ ...v, brand_color: val }));
                          applyBrandingToDom({ ...form, brand_color: val });
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Clique para abrir seletor de cores"
                      />
                    </div>
                    <Input
                      id="brand_color"
                      value={form.brand_color}
                      onChange={(e) => {
                        const val = e.target.value;
                        setForm(v => ({ ...v, brand_color: val }));
                        applyBrandingToDom({ ...form, brand_color: val });
                      }}
                      className="rounded-xl font-mono text-sm h-11"
                      placeholder="Ex: #10B981 ou oklch(0.72 0.19 148)"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Utilizada em elementos secundários, badges e contrastes.</p>
                </div>
              </div>

              {/* Presets */}
              <div className="pt-3 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground mb-3">Paletas Prontas (Clique para aplicar):</p>
                <div className="flex flex-wrap gap-2">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        const updated = { ...form, primary_color: p.color, brand_color: p.brand };
                        setForm(updated);
                        applyBrandingToDom(updated);
                      }}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-card hover:bg-accent text-xs font-medium transition-colors cursor-pointer"
                    >
                      <span className="size-3.5 rounded-full border border-black/10" style={{ backgroundColor: p.color }} />
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Demonstration */}
              <div className="pt-4 border-t border-border/50 bg-muted/20 p-4 rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-primary" /> Demonstração em Tempo Real:
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" size="sm" className="rounded-xl shadow-sm">
                    Botão Primário
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-xl border-primary text-primary hover:bg-primary/10">
                    Botão Outline
                  </Button>
                  <div
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-sm"
                    style={{ backgroundColor: form.brand_color, color: "#ffffff" }}
                  >
                    Badge da Marca
                  </div>
                  <div className="px-3 py-1 rounded-lg border border-primary/40 bg-primary/10 text-xs font-medium text-foreground">
                    Foco / Seleção Ativa
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
             <Button 
               type="submit" 
               className="rounded-2xl px-8 h-12 gap-2"
               disabled={mutation.isPending}
             >
               {mutation.isPending ? (
                 "Salvando..."
               ) : (
                 <>
                   <Save className="size-4" /> Salvar Alterações
                 </>
               )}
             </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
