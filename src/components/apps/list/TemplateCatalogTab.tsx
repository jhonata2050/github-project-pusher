import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_TEMPLATES, type AppTemplate } from "@/lib/templates.data";
import { TemplateCard } from "./TemplateCard";

export interface TemplateCatalogTabProps {
  templateSearch: string;
  setTemplateSearch: (s: string) => void;
  templateCategory: string;
  setTemplateCategory: (c: string) => void;
  onOpenInstall: (tmpl: AppTemplate) => void;
}

export function TemplateCatalogTab({
  templateSearch,
  setTemplateSearch,
  templateCategory,
  setTemplateCategory,
  onOpenInstall,
}: TemplateCatalogTabProps) {
  const filteredTemplates = APP_TEMPLATES.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.description.toLowerCase().includes(templateSearch.toLowerCase()) ||
      Boolean(t.tags?.some((tag) => tag.toLowerCase().includes(templateSearch.toLowerCase())));

    const matchesCategory = templateCategory === "all" || t.category === templateCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: "all", label: "Todos", count: APP_TEMPLATES.length },
    { id: "websites", label: "Sites & CMS", count: APP_TEMPLATES.filter((t) => t.category === "websites").length },
    { id: "languages", label: "Linguagens", count: APP_TEMPLATES.filter((t) => t.category === "languages").length },
    { id: "bots", label: "Bots & WhatsApp", count: APP_TEMPLATES.filter((t) => t.category === "bots").length },
    { id: "automations", label: "Automação", count: APP_TEMPLATES.filter((t) => t.category === "automations").length },
    { id: "apis", label: "APIs", count: APP_TEMPLATES.filter((t) => t.category === "apis").length },
    { id: "databases", label: "Bancos de Dados", count: APP_TEMPLATES.filter((t) => t.category === "databases").length },
    { id: "tools", label: "Ferramentas", count: APP_TEMPLATES.filter((t) => t.category === "tools").length },
  ];

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Busca Reorganizada */}
      <div className="bg-card p-5 rounded-3xl border shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          <div>
            <h2 className="text-base font-bold tracking-tight">Catálogo de Modelos Pré-Configurados</h2>
            <p className="text-xs text-muted-foreground">Escolha uma stack, bot ou banco de dados e faça deploy em 1-clique.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar modelos, tags, banco..."
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              className="pl-9 rounded-2xl text-xs h-9 bg-muted/30 border-border focus:bg-background"
            />
          </div>
        </div>

        {/* Categorias em Pílulas com Contador */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-2 border-t no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setTemplateCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                templateCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-xs font-bold"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  templateCategory === cat.id
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-background text-muted-foreground border"
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid dos Cards de Modelos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredTemplates.map((tmpl) => (
          <TemplateCard key={tmpl.id} tmpl={tmpl} onOpenInstall={onOpenInstall} />
        ))}

        {filteredTemplates.length === 0 && (
          <div className="col-span-full p-12 text-center bg-card rounded-3xl border space-y-3">
            <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="font-bold text-sm">Nenhum modelo encontrado</p>
            <p className="text-xs text-muted-foreground">Tente buscar por outro termo ou categoria.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setTemplateSearch("");
                setTemplateCategory("all");
              }}
              className="rounded-xl text-xs"
            >
              Limpar Filtros
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
