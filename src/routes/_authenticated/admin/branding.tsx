import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Palette, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/button";
import { getBranding, updateBranding, type BrandingSettings } from "@/lib/admin.functions";
import { applyBrandingToDom } from "@/hooks/use-branding";
import { supabase } from "@/integrations/supabase/client";
import {
  type BrandingPreset,
  BrandingIdentityCard,
  BrandingPaletteCard,
} from "@/components/admin/branding";

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "favicon") => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(type);
      
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Math.random()}.${fileExt}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(filePath);

      setForm((prev) => ({
        ...prev,
        [type === "logo" ? "logo_url" : "favicon_url"]: publicUrl,
      }));
      
      toast.success(`${type === "logo" ? "Logo" : "Favicon"} carregado com sucesso!`);
    } catch (error: any) {
      toast.error(`Erro no upload: ${error.message}`);
    } finally {
      setUploading(null);
    }
  };

  const handleApplyPreset = (preset: BrandingPreset) => {
    const updated = { ...form, primary_color: preset.color, brand_color: preset.brand };
    setForm(updated);
    applyBrandingToDom(updated);
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
          <BrandingIdentityCard
            form={form}
            uploading={uploading}
            onFormChange={setForm}
            onFileUpload={handleFileUpload}
          />

          <BrandingPaletteCard
            form={form}
            onFormChange={setForm}
            onApplyPreset={handleApplyPreset}
          />

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
