import { useState, useEffect } from "react";

export function useAppModals(appName?: string) {
  const [isStopAppConfirmOpen, setIsStopAppConfirmOpen] = useState(false);
  const [isGitDeployConfirmOpen, setIsGitDeployConfirmOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Edição do Nome da Aplicação
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameInput, setEditingNameInput] = useState("");

  useEffect(() => {
    if (appName && !isEditingName) {
      setEditingNameInput(appName);
    }
  }, [appName, isEditingName]);

  return {
    isStopAppConfirmOpen,
    setIsStopAppConfirmOpen,
    isGitDeployConfirmOpen,
    setIsGitDeployConfirmOpen,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    isEditingName,
    setIsEditingName,
    editingNameInput,
    setEditingNameInput,
  };
}
