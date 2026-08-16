import { createFileRoute } from "@tanstack/react-router";
import { Cog, Palette, Layout, Globe, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBranding, updateBranding } from "@/lib/admin.functions";
import type { BrandingSettings } from "@/lib/branding";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: BrandingSettingsPage,
});

function BrandingSettingsPage() {
  const queryClient = useQueryClient();
  const { data: branding, isLoading } = useQuery({
    queryKey: ["admin-branding"],
    queryFn: async () => {
      const response = await fetch("/api/public/branding");
      if (!response.ok) throw new Error("Failed to fetch branding");
      return await response.json();
    },
  });

  const [form, setForm] = useState<BrandingSettings>({
    logo_url: "",
    app_name: "HostPanel",
    primary_color: "oklch(0.88 0.19 128)",
    brand_color: "oklch(0.72 0.19 148)",
    favicon_url: "",
  });

  useEffect(() => {
    if (branding) {
      setForm(branding);
    }
  }, [branding]);

  const mutation = useMutation({
    mutationFn: async (data: BrandingSettings) => {
      const token = (await queryClient.fetchQuery({
        queryKey: ["supabase-session"],
        queryFn: async () => {
          const { supabase } = await import("@/integrations/supabase/client");
          const { data } = await supabase.auth.getSession();
          return data.session?.access_token;
        }
      }));
      
      const response = await fetch("/api/public/branding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erro ao salvar branding");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast.success("Configurações de branding salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-branding"] });
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar configurações: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) {
    return (
      <AppShell area="admin" breadcrumb={<span>Admin / Branding</span>}>
        <div className="p-8 text-center text-muted-foreground text-sm">Carregando configurações...</div>
      </AppShell>
    );
  }

  return (
    <AppShell
      area="admin"
      breadcrumb={
        <>
          <span className="flex items-center gap-2">
            <Cog className="size-4" />
            Sistema
          </span>
          <span>/</span>
          <span className="flex items-center gap-2 font-medium text-foreground">
            <Palette className="size-4" />
            Branding e Visual
          </span>
        </>
      }
    >
      <div className="mt-6 flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Branding do Sistema</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a identidade visual da sua plataforma, incluindo logo, cores e nome.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="bg-muted/50 p-1 rounded-xl h-11 mb-4">
              <TabsTrigger value="general" className="rounded-lg h-9 gap-2">
                <Globe className="size-4" /> Geral
              </TabsTrigger>
              <TabsTrigger value="colors" className="rounded-lg h-9 gap-2">
                <Palette className="size-4" /> Cores
              </TabsTrigger>
              <TabsTrigger value="layout" className="rounded-lg h-9 gap-2">
                <Layout className="size-4" /> Layout
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card className="rounded-3xl border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Identidade Básica</CardTitle>
                  <CardDescription>Nome e imagens principais da plataforma.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="app_name">Nome da Aplicação</Label>
                    <Input
                      id="app_name"
                      value={form.app_name}
                      onChange={(e) => setForm({ ...form, app_name: e.target.value })}
                      placeholder="Ex: HostPanel"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="logo_url">URL do Logotipo (Área Superior)</Label>
                    <div className="flex gap-4 items-start">
                      <Input
                        id="logo_url"
                        value={form.logo_url || ""}
                        onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                        placeholder="https://exemplo.com/logo.png"
                        className="rounded-xl flex-1"
                      />
                      {form.logo_url && (
                        <div className="size-12 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center p-1">
                          <img src={form.logo_url} alt="Preview Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Exibido no menu lateral e topo da página inicial.</p>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="favicon_url">URL do Favicon / Ícone do Navegador</Label>
                    <div className="flex gap-4 items-start">
                      <Input
                        id="favicon_url"
                        value={form.favicon_url || ""}
                        onChange={(e) => setForm({ ...form, favicon_url: e.target.value })}
                        placeholder="https://exemplo.com/favicon.ico"
                        className="rounded-xl flex-1"
                      />
                      {form.favicon_url && (
                        <div className="size-12 rounded-xl border border-border overflow-hidden bg-muted flex items-center justify-center p-2">
                          <img src={form.favicon_url} alt="Preview Favicon" className="size-6 object-contain" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Ícone que aparece na aba do navegador.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="colors">
              <Card className="rounded-3xl border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Paleta de Cores</CardTitle>
                  <CardDescription>Defina as cores principais do sistema (formato CSS/OKLCH).</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="primary_color">Cor Primária (OKLCH)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="primary_color"
                          value={form.primary_color}
                          onChange={(e) => setForm({ ...form, primary_color: e.target.value })}
                          className="rounded-xl font-mono text-xs"
                        />
                        <div 
                          className="size-11 rounded-xl border border-border" 
                          style={{ backgroundColor: form.primary_color }} 
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="brand_color">Cor da Marca (OKLCH)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="brand_color"
                          value={form.brand_color}
                          onChange={(e) => setForm({ ...form, brand_color: e.target.value })}
                          className="rounded-xl font-mono text-xs"
                        />
                        <div 
                          className="size-11 rounded-xl border border-border" 
                          style={{ backgroundColor: form.brand_color }} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-muted/30 rounded-2xl border border-dashed border-border text-xs text-muted-foreground">
                    <p className="font-semibold mb-1">Dica:</p>
                    O sistema usa OKLCH por padrão para melhor acessibilidade e contraste. 
                    Exemplo de verde limão: <code className="bg-muted px-1 rounded">oklch(0.88 0.19 128)</code>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="layout">
              <Card className="rounded-3xl border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle>Preferências de Layout</CardTitle>
                  <CardDescription>Ajustes visuais globais da interface.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground italic">Em breve: Opções de arredondamento de bordas, densidade da UI e modo escuro padrão.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="mt-8 flex justify-end">
            <Button 
              type="submit" 
              disabled={mutation.isPending}
              className="rounded-xl px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/90 flex gap-2"
            >
              <Save className="size-4" />
              {mutation.isPending ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}