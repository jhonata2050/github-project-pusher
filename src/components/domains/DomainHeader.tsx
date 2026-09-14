import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DomainDetails } from "./types";

interface DomainHeaderProps {
  domain: DomainDetails;
}

export function DomainHeader({ domain }: DomainHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-xl">
          <Link to="/domains">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            {domain.domain_name}
            <Badge
              className={cn(
                "rounded-full text-[10px] uppercase font-bold px-3 py-0.5",
                domain.status === "active"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-warning/10 text-warning"
              )}
            >
              {domain.status === "active" ? "Ativo" : domain.status}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Registrado em:{" "}
            {new Date(domain.registration_date || domain.created_at).toLocaleDateString("pt-BR")} •
            Expiração:{" "}
            {domain.expiry_date
              ? new Date(domain.expiry_date).toLocaleDateString("pt-BR")
              : "---"}
          </p>
        </div>
      </div>
    </div>
  );
}
