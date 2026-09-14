import React from "react";
import { Type, Upload, AlertCircle, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BrandingIdentityCardProps } from "./types";

export const BrandingIdentityCard: React.FC<BrandingIdentityCardProps> = ({
  form,
  uploading,
  onFormChange,
  onFileUpload,
}) => {
  return (
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
            onChange={(e) => onFormChange((v) => ({ ...v, app_name: e.target.value }))}
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
                    onClick={() => onFormChange((v) => ({ ...v, logo_url: "" }))}
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
                    onChange={(e) => onFormChange((v) => ({ ...v, logo_url: e.target.value }))}
                    className="rounded-xl text-xs h-9"
                  />
                  <Label htmlFor="logo-upload" className="shrink-0 cursor-pointer">
                    <div className="flex items-center justify-center px-3 h-9 border border-input bg-background hover:bg-accent rounded-xl transition-colors text-xs font-medium">
                      {uploading === "logo" ? "Enviando..." : "Upload"}
                    </div>
                  </Label>
                  <Input 
                    id="logo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => onFileUpload(e, "logo")}
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
                    onClick={() => onFormChange((v) => ({ ...v, favicon_url: "" }))}
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
                    onChange={(e) => onFormChange((v) => ({ ...v, favicon_url: e.target.value }))}
                    className="rounded-xl text-xs h-9"
                  />
                  <Label htmlFor="favicon-upload" className="shrink-0 cursor-pointer">
                    <div className="flex items-center justify-center px-3 h-9 border border-input bg-background hover:bg-accent rounded-xl transition-colors text-xs font-medium">
                      {uploading === "favicon" ? "Enviando..." : "Upload"}
                    </div>
                  </Label>
                  <Input 
                    id="favicon-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => onFileUpload(e, "favicon")}
                    disabled={!!uploading}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
