import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VPSPlansHeaderProps } from "./types";

export function VPSPlansHeader({ term, onTermChange, onCreate }: VPSPlansHeaderProps) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planos VPS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Área exclusiva de planos de servidores VPS. Planos de hospedagem web ficam em{" "}
            <Link to="/admin/products" className="text-brand underline">
              Produtos e planos
            </Link>
            .
          </p>
        </div>
        <Button 
          className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90" 
          onClick={onCreate}
        >
          <Plus className="mr-1 size-4" />
          Novo plano VPS
        </Button>
      </div>

      <div className="mt-6 relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => onTermChange(e.target.value)}
          placeholder="Pesquisar plano VPS"
          className="h-11 rounded-xl pl-9"
        />
      </div>
    </>
  );
}
