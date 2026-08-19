import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Save, Upload, Type, Paintbrush, Globe, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBranding, updateBranding, type BrandingSettings } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/branding")({
  component: BrandingSettingsPage,
});

function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const { data: branding, isLoading } = useQuery({
    queryKey: ["branding-admin"],
    queryFn: () => getBranding(),
  });

  const [form, setForm] = useState<BrandingSettings>({
    logo_url: "",
    app_name: "HostPanel",
    primary_color: "#3B82F6",
    brand_color: "#3B82F6",
    favicon_url: "",
  });

  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (branding) {
      setForm({
        ...branding,
        logo_url: branding.logo_url || "",
        favicon_url: branding.favicon_url || "",
      });
    }
  }, [branding]);

  const mutation = useMutation({
    mutationFn: (data: BrandingSettings) => updateBranding({ data: { data } }),
    onSuccess: () => {
      toast.success("Configurações de branding atualizadas com sucesso!");
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
                    <div className="w-full">
                      <Label htmlFor="logo-upload" className="w-full">
                        <div className="flex items-center justify-center w-full px-4 py-2 border border-input bg-background hover:bg-accent rounded-xl cursor-pointer transition-colors text-sm font-medium">
                          {uploading === 'logo' ? "Enviando..." : "Selecionar Logo"}
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
                    <div className="w-full">
                      <Label htmlFor="favicon-upload" className="w-full">
                        <div className="flex items-center justify-center w-full px-4 py-2 border border-input bg-background hover:bg-accent rounded-xl cursor-pointer transition-colors text-sm font-medium">
                          {uploading === 'favicon' ? "Enviando..." : "Selecionar Favicon"}
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
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="size-5 text-primary" /> Paleta de Cores
              </CardTitle>
              <CardDescription>Defina as cores predominantes para os clientes.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label htmlFor="primary_color">Cor Primária (OKLCH ou Hex)</Label>
                <div className="flex gap-3">
                  <div 
                    className="size-10 rounded-xl border border-border shrink-0" 
                    style={{ backgroundColor: form.primary_color.includes('oklch') ? `var(--primary)` : form.primary_color }}
                  />
                  <Input
                    id="primary_color"
                    value={form.primary_color}
                    onChange={e => setForm(v => ({ ...v, primary_color: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Utilizada em botões e estados ativos.</p>
              </div>

              <div className="space-y-4">
                <Label htmlFor="brand_color">Cor da Marca (OKLCH ou Hex)</Label>
                <div className="flex gap-3">
                  <div 
                    className="size-10 rounded-xl border border-border shrink-0" 
                    style={{ backgroundColor: form.brand_color.includes('oklch') ? `var(--brand)` : form.brand_color }}
                  />
                  <Input
                    id="brand_color"
                    value={form.brand_color}
                    onChange={e => setForm(v => ({ ...v, brand_color: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Utilizada em elementos de branding secundários.</p>
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
