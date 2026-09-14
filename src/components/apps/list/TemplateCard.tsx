import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppTemplate } from "@/lib/templates.data";

export interface TemplateCardProps {
  tmpl: AppTemplate;
  onOpenInstall: (tmpl: AppTemplate) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  websites: "Sites & CMS",
  languages: "Linguagens",
  bots: "Bots & WhatsApp",
  automations: "Automação",
  apis: "APIs & Backend",
  databases: "Bancos de Dados",
  tools: "Ferramentas",
};

export function TemplateCard({ tmpl, onOpenInstall }: TemplateCardProps) {
  return (
    <Card className="rounded-3xl border hover:border-primary/50 transition-all flex flex-col justify-between group shadow-xs hover:shadow-md bg-card">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="h-12 w-12 rounded-2xl bg-muted/60 p-2.5 flex items-center justify-center border group-hover:border-primary/30 group-hover:scale-105 transition-all">
            <img
              src={tmpl.icon}
              alt={tmpl.name}
              className="h-full w-full object-contain"
              onError={(e: any) => {
                e.target.src = "https://raw.githubusercontent.com/baptisteArno/typebot.io/main/apps/builder/public/favicon.svg";
              }}
            />
          </div>
          <Badge variant="outline" className="rounded-xl text-[10px] font-semibold text-muted-foreground bg-muted/30 px-2.5 py-0.5 border">
            {CATEGORY_LABELS[tmpl.category] || tmpl.category}
          </Badge>
        </div>

        <CardTitle className="text-sm font-bold group-hover:text-primary transition-colors leading-tight line-clamp-1">
          {tmpl.name}
        </CardTitle>
        <CardDescription className="text-xs line-clamp-2 mt-1.5 leading-5 text-muted-foreground min-h-[2.5rem]">
          {tmpl.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-5 pt-0 space-y-3.5 mt-auto">
        <div className="flex flex-wrap gap-1 min-h-[1.375rem]">
          {tmpl.tags?.slice(0, 4).map((tag) => (
            <span key={tag} className="text-[10px] bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-md font-mono">
              {tag}
            </span>
          ))}
        </div>

        <div className="pt-3.5 border-t flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-muted-foreground/80 tracking-wide uppercase">Mínimo Recomendado</p>
            <div className="flex items-center gap-1.5 font-bold text-xs text-foreground mt-1">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold">
                {tmpl.recommended_ram} MB
              </span>
              <span className="text-muted-foreground font-light">•</span>
              <span className="bg-muted px-2 py-0.5 rounded-md font-mono text-[11px] text-muted-foreground font-semibold">
                {tmpl.recommended_cpu} vCPU
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onOpenInstall(tmpl)}
            className="rounded-xl text-xs gap-1.5 font-bold shadow-xs px-4 h-9 shrink-0"
          >
            <Zap className="h-3.5 w-3.5 fill-current" /> Instalar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
