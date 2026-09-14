import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminTicketsPaginationProps {
  currentCount: number;
  totalItems: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export function AdminTicketsPagination({
  currentCount,
  totalItems,
  page,
  totalPages,
  onPageChange,
}: AdminTicketsPaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      <div className="text-xs text-muted-foreground">
        Mostrando {currentCount} de {totalItems} tickets
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-8 text-xs"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft className="size-3.5 mr-1" /> Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl h-8 text-xs"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          Próximo <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
