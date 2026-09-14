import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientsPaginationProps {
  page: number;
  totalPages: number;
  filteredCount: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
}

export function ClientsPagination({
  page,
  totalPages,
  filteredCount,
  totalItems,
  onPageChange,
}: ClientsPaginationProps) {
  return (
    <div className="mt-6 flex items-center justify-between gap-4">
      <div className="text-sm text-muted-foreground">
        Mostrando {filteredCount} de {totalItems} clientes
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-4 mr-2" /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Próximo <ChevronRight className="size-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
