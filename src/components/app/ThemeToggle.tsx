import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "icon" | "sm" | "default";
}

export function ThemeToggle({
  className,
  variant = "ghost",
  size = "icon",
}: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={cn(
        "size-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-all flex items-center justify-center shrink-0 cursor-pointer",
        className
      )}
      title={resolvedTheme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
      aria-label={resolvedTheme === "dark" ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="size-5 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="size-5 text-sidebar-foreground transition-transform hover:-rotate-12" />
      )}
    </Button>
  );
}
