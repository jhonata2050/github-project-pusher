import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { STATUS_FILTERS } from "./types";

interface AdminTicketsFiltersProps {
  selectedStatus: string;
  onSelectStatus: (status: string) => void;
  search: string;
  onSearchChange: (search: string) => void;
}

export function AdminTicketsFilters({
  selectedStatus,
  onSelectStatus,
  search,
  onSearchChange,
}: AdminTicketsFiltersProps) {
  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => onSelectStatus(f.id)}
            className={cn(
              "px-4 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap",
              selectedStatus === f.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          placeholder="Buscar por assunto, cliente ou ID..." 
          className="pl-11 rounded-2xl border-none bg-muted/50 h-11"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
    </>
  );
}
