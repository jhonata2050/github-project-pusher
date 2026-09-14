import { Sparkles, Sun, Moon, Monitor } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Theme } from "@/hooks/use-theme";

interface ProfileThemeSelectorProps {
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function ProfileThemeSelector({
  theme,
  onThemeChange,
}: ProfileThemeSelectorProps) {
  return (
    <Card className="rounded-3xl border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <CardTitle className="text-sm font-bold">Aparência do Painel</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Escolha a paleta de cores para navegar no sistema.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <button
          type="button"
          onClick={() => onThemeChange("light")}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
            theme === "light"
              ? "border-primary bg-primary/5 text-foreground font-bold shadow-xs ring-1 ring-primary"
              : "border-border hover:border-muted-foreground/30 bg-card text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Sun className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Modo Claro</p>
              <p className="text-[11px] text-muted-foreground">Fundo branco e limpo</p>
            </div>
          </div>
          {theme === "light" && <Badge className="text-[10px] h-5 px-1.5">Ativo</Badge>}
        </button>

        <button
          type="button"
          onClick={() => onThemeChange("dark")}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
            theme === "dark"
              ? "border-primary bg-primary/5 text-foreground font-bold shadow-xs ring-1 ring-primary"
              : "border-border hover:border-muted-foreground/30 bg-card text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Moon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Modo Escuro (Terminal)</p>
              <p className="text-[11px] text-muted-foreground">Fundo preto #000606</p>
            </div>
          </div>
          {theme === "dark" && <Badge className="text-[10px] h-5 px-1.5">Ativo</Badge>}
        </button>

        <button
          type="button"
          onClick={() => onThemeChange("system")}
          className={cn(
            "w-full flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer text-left",
            theme === "system"
              ? "border-primary bg-primary/5 text-foreground font-bold shadow-xs ring-1 ring-primary"
              : "border-border hover:border-muted-foreground/30 bg-card text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-muted text-muted-foreground">
              <Monitor className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Sistema</p>
              <p className="text-[11px] text-muted-foreground">Acompanha seu dispositivo</p>
            </div>
          </div>
          {theme === "system" && <Badge className="text-[10px] h-5 px-1.5">Ativo</Badge>}
        </button>
      </CardContent>
    </Card>
  );
}
