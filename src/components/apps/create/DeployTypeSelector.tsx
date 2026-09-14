import { Upload, Github, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DeployType } from "./types";

export interface DeployTypeSelectorProps {
  deployType: DeployType;
  onChangeDeployType: (type: DeployType) => void;
}

export function DeployTypeSelector({
  deployType,
  onChangeDeployType,
}: DeployTypeSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <button
        type="button"
        onClick={() => onChangeDeployType("zip")}
        className={cn(
          "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center gap-2 cursor-pointer",
          deployType === "zip"
            ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
            : "border-border hover:border-muted-foreground/50 text-muted-foreground"
        )}
      >
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Upload className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold">Upload ZIP</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeDeployType("github")}
        className={cn(
          "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center gap-2 cursor-pointer",
          deployType === "github"
            ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
            : "border-border hover:border-muted-foreground/50 text-muted-foreground"
        )}
      >
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Github className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold">GitHub</span>
      </button>

      <button
        type="button"
        onClick={() => onChangeDeployType("templates")}
        className={cn(
          "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all text-center gap-2 cursor-pointer",
          deployType === "templates"
            ? "border-primary bg-primary/5 text-primary font-bold shadow-sm"
            : "border-border hover:border-muted-foreground/50 text-muted-foreground"
        )}
      >
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5" />
        </div>
        <span className="text-xs font-semibold">Templates</span>
      </button>
    </div>
  );
}
