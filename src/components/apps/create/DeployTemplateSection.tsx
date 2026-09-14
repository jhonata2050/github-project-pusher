import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { APP_TEMPLATES, type AppTemplate, getRequiredDiskWithMargin } from "@/lib/templates.data";

export interface DeployTemplateSectionProps {
  selectedTemplate: AppTemplate | null;
  onSelectTemplate: (template: AppTemplate) => void;
  templateCategory: string;
  onChangeTemplateCategory: (category: string) => void;
}

const TEMPLATE_CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "websites", label: "Sites & CMS" },
  { id: "languages", label: "Linguagens" },
  { id: "bots", label: "Bots & WhatsApp" },
  { id: "automations", label: "Automação" },
  { id: "apis", label: "APIs & Backend" },
  { id: "databases", label: "Bancos" },
  { id: "tools", label: "Ferramentas" },
];

export function DeployTemplateSection({
  selectedTemplate,
  onSelectTemplate,
  templateCategory,
  onChangeTemplateCategory,
}: DeployTemplateSectionProps) {
  const filteredTemplates = APP_TEMPLATES.filter(
    (t) => templateCategory === "all" || t.category === templateCategory
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2">
        <Label className="text-xs">Escolha a Categoria e o Modelo Pré-Configurado</Label>

        {/* Menu Separador de Categorias no Topo */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChangeTemplateCategory(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all cursor-pointer",
                templateCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/70 text-muted-foreground hover:bg-muted"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 max-h-84 overflow-y-auto pr-1">
        {filteredTemplates.map((tmpl) => {
          const isSelected = selectedTemplate?.id === tmpl.id;
          return (
            <button
              key={tmpl.id}
              type="button"
              onClick={() => onSelectTemplate(tmpl)}
              className={cn(
                "p-3 rounded-2xl border text-left flex items-start gap-3 transition-all cursor-pointer",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary shadow-xs"
                  : "hover:border-border hover:bg-muted/30"
              )}
            >
              <div className="h-9 w-9 rounded-xl bg-white dark:bg-zinc-800 p-1.5 flex items-center justify-center border shadow-xs flex-shrink-0 mt-0.5">
                <img
                  src={tmpl.icon}
                  alt={tmpl.name}
                  className="h-full w-full object-contain"
                  onError={(e: any) => {
                    e.target.src =
                      "https://cdn.simpleicons.org/docker/2496ED";
                  }}
                />
              </div>
              <div className="overflow-hidden min-w-0">
                <p className="font-bold text-xs truncate text-foreground">{tmpl.name}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  <span className="font-semibold text-primary">{tmpl.recommended_ram}MB RAM</span> •{" "}
                  {tmpl.recommended_cpu} vCPU •{" "}
                  <span className="font-medium text-amber-600 dark:text-amber-400">
                    {getRequiredDiskWithMargin(tmpl.recommended_disk)}MB HD
                  </span>
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
