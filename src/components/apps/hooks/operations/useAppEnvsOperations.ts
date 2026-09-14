import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { saveApplicationEnvs, executeAppAction } from "@/lib/cloud-apps.functions";
import type { AppEnvItem } from "../types";
import type { UseAppOperationsParams } from "./types";

export function useAppEnvsOperations({
  appId,
  envsData,
  refetchApp,
  onRestartRequest,
}: {
  appId: string;
  envsData: AppEnvItem[] | undefined;
  refetchApp: () => void;
  onRestartRequest?: () => void;
}) {
  const queryClient = useQueryClient();
  const [envsList, setEnvsList] = useState<AppEnvItem[]>([]);

  useEffect(() => {
    if (envsData) {
      setEnvsList(envsData);
    }
  }, [envsData]);

  const saveEnvsMutation = useMutation({
    mutationFn: async ({ shouldRestart }: { shouldRestart?: boolean } = {}) => {
      await saveApplicationEnvs({ data: { appId, envs: envsList } });
      if (shouldRestart) {
        await executeAppAction({ data: { appId, action: "restart" } });
      }
      return { shouldRestart };
    },
    onSuccess: (res) => {
      if (res?.shouldRestart) {
        toast.success("🎉 Variáveis salvas e aplicação reiniciada com sucesso!");
        queryClient.invalidateQueries({ queryKey: ["applicationDetails", appId] });
        refetchApp();
      } else {
        toast.success("Variáveis salvas! Reinicie ou faça Re-Deploy da aplicação para carregá-las.", {
          duration: 7000,
          action: onRestartRequest ? {
            label: "Reiniciar Agora",
            onClick: onRestartRequest,
          } : undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["applicationEnvs", appId] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao salvar variáveis.");
    },
  });

  return {
    envsList,
    setEnvsList,
    saveEnvsMutation,
  };
}
