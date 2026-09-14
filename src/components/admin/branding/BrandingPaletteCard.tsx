import React from "react";
import { Paintbrush, Pipette, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyBrandingToDom } from "@/hooks/use-branding";
import { PRESETS } from "./constants";
import type { BrandingPaletteCardProps } from "./types";

export const BrandingPaletteCard: React.FC<BrandingPaletteCardProps> = ({
  form,
  onFormChange,
  onApplyPreset,
}) => {
  return (
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
                  value={form.primary_color.startsWith("#") && form.primary_color.length === 7 ? form.primary_color : "#3b82f6"}
                  onChange={(e) => {
                    const val = e.target.value;
                    onFormChange((v) => ({ ...v, primary_color: val }));
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
                  onFormChange((v) => ({ ...v, primary_color: val }));
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
                  value={form.brand_color.startsWith("#") && form.brand_color.length === 7 ? form.brand_color : "#10b981"}
                  onChange={(e) => {
                    const val = e.target.value;
                    onFormChange((v) => ({ ...v, brand_color: val }));
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
                  onFormChange((v) => ({ ...v, brand_color: val }));
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
                onClick={() => onApplyPreset(p)}
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
  );
};
