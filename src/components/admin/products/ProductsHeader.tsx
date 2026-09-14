import { Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ProductsHeaderProps {
  term: string;
  setTerm: (term: string) => void;
  onCreate: () => void;
}

export function ProductsHeader({ term, setTerm, onCreate }: ProductsHeaderProps) {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Seus produtos</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Hospedagem web, domínios e adicionais. Planos de VPS ficam na área exclusiva{" "}
        <Link to="/admin/vps/plans" className="text-brand underline">Planos VPS</Link>.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar"
            className="h-11 rounded-xl pl-9"
          />
        </div>
        <Button 
          className="h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onCreate}
        >
          <Plus className="mr-1 size-4" />
          Novo
        </Button>
      </div>
    </>
  );
}
