import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ClientsSearchBarProps {
  term: string;
  onSearchChange: (value: string) => void;
}

export function ClientsSearchBar({ term, onSearchChange }: ClientsSearchBarProps) {
  return (
    <div className="relative mt-6 max-w-sm">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={term}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Pesquisar por nome, e-mail ou documento"
        className="h-11 rounded-xl pl-9"
      />
    </div>
  );
}
