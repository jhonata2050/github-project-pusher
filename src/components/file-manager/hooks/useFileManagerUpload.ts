import { useState, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface UseFileManagerUploadParams {
  appId: string;
  currentPath: string;
  refetch: () => void;
}

export function useFileManagerUpload({
  appId,
  currentPath,
  refetch,
}: UseFileManagerUploadParams) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");

  const handleUploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setIsUploading(true);
      setUploadProgress(0);
      setUploadStatusText("Iniciando upload...");

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        if (!token) {
          throw new Error("Sessão expirada. Faça login novamente.");
        }

        let totalBytesAllFiles = 0;
        for (let i = 0; i < files.length; i++) {
          const f = files[i];
          if (f) totalBytesAllFiles += f.size;
        }

        const formatBytes = (bytes: number): string => {
          if (bytes === 0) return "0 B";
          const k = 1024;
          const sizes = ["B", "KB", "MB", "GB"];
          const idx = Math.floor(Math.log(bytes) / Math.log(k));
          const unit = sizes[idx] || "B";
          return parseFloat((bytes / Math.pow(k, idx)).toFixed(1)) + " " + unit;
        };

        let uploadedBytesPriorFiles = 0;
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file) continue;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append("appId", appId);
            formData.append("targetDir", currentPath);
            formData.append("file", file);

            xhr.upload.onprogress = (event) => {
              if (event.lengthComputable) {
                const currentTotalSent = uploadedBytesPriorFiles + event.loaded;
                const percent =
                  totalBytesAllFiles > 0
                    ? Math.min(99, Math.round((currentTotalSent / totalBytesAllFiles) * 100))
                    : 100;

                setUploadProgress(percent);
                const loadedFmt = formatBytes(currentTotalSent);
                const totalFmt = formatBytes(totalBytesAllFiles);
                setUploadStatusText(
                  `Enviando (${i + 1}/${files.length}): ${file.name} — ${loadedFmt} / ${totalFmt} (${percent}%)`
                );
              }
            };

            xhr.onload = () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                uploadedBytesPriorFiles += file.size;
                successCount++;
                resolve();
              } else {
                try {
                  const errData = JSON.parse(xhr.responseText);
                  reject(new Error(errData.error || `Erro ${xhr.status} no upload de ${file.name}`));
                } catch {
                  reject(new Error(`Erro HTTP ${xhr.status} no upload de ${file.name}`));
                }
              }
            };

            xhr.onerror = () => reject(new Error(`Falha de rede ao enviar ${file.name}`));
            xhr.ontimeout = () => reject(new Error(`Tempo limite excedido ao enviar ${file.name}`));

            xhr.open("POST", "/api/file-manager/upload");
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
            xhr.send(formData);
          });
        }

        setUploadProgress(100);
        setUploadStatusText("Concluído!");
        toast.success(`✓ ${successCount} arquivo(s) gravado(s) com sucesso no servidor!`);

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }

        queryClient.invalidateQueries({ queryKey: ["realFileManagerFiles", appId] });
        refetch();

        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          setUploadStatusText("");
        }, 1200);
      } catch (err: any) {
        toast.error("Erro ao fazer upload: " + err.message);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStatusText("");
      }
    },
    [appId, currentPath, queryClient, refetch]
  );

  return {
    fileInputRef,
    isUploading,
    uploadProgress,
    uploadStatusText,
    handleUploadFiles,
  };
}
