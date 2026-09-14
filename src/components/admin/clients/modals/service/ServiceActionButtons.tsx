import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface ServiceActionButtonsProps {
  editingService: any;
  hostingActionMutation: {
    isPending: boolean;
    mutate: (vars: { serviceId: string; action: "suspend" | "unsuspend" | "delete" }) => void;
  };
  isSaving: boolean;
}

export function ServiceActionButtons({
  editingService,
  hostingActionMutation,
  isSaving,
}: ServiceActionButtonsProps) {
  return (
    <>
      <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
        {editingService.status === "active" ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl text-orange-600 border-orange-200 hover:bg-orange-50 h-11"
            onClick={() => hostingActionMutation.mutate({ serviceId: editingService.id, action: "suspend" })}
            disabled={hostingActionMutation.isPending}
          >
            Suspender
          </Button>
        ) : editingService.status === "suspended" ? (
          <Button
            type="button"
            variant="outline"
            className="flex-1 rounded-xl text-green-600 border-green-200 hover:bg-green-50 h-11"
            onClick={() => hostingActionMutation.mutate({ serviceId: editingService.id, action: "unsuspend" })}
            disabled={hostingActionMutation.isPending}
          >
            Reativar
          </Button>
        ) : null}

        <Button
          type="button"
          variant="outline"
          className="flex-1 rounded-xl text-red-600 border-red-200 hover:bg-red-50 h-11"
          onClick={() => {
            if (confirm("Tem certeza que deseja DELETAR esta conta no servidor? Esta ação é irreversível.")) {
              hostingActionMutation.mutate({ serviceId: editingService.id, action: "delete" });
            }
          }}
          disabled={hostingActionMutation.isPending}
        >
          Deletar no Server
        </Button>
      </div>

      <DialogFooter className="pt-4">
        <Button
          type="submit"
          disabled={isSaving}
          className="bg-brand text-brand-foreground w-full rounded-2xl h-11 font-bold text-sm"
        >
          {isSaving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </DialogFooter>
    </>
  );
}
