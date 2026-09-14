import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavSection } from "./nav-config";

export interface SidebarSectionProps {
  section: NavSection;
  pathname: string;
}

export function SidebarSection({ section, pathname }: SidebarSectionProps) {
  const hasActive = section.links.some((l) => pathname.startsWith(l.to));
  const [open, setOpen] = useState(hasActive);
  const Icon = section.icon;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
      >
        <span className="flex items-center gap-3">
          <Icon className="size-4 text-muted-foreground" />
          {section.label}
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && section.links.length > 0 && (
        <div className="ml-3 mt-1 space-y-1 border-l border-sidebar-border pl-3">
          {section.links.map((link) => {
            const LinkIcon = link.icon ?? Package;
            const active = pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary font-medium text-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent",
                )}
              >
                <LinkIcon className="size-4" />
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
