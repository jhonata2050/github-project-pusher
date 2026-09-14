import React from "react";
import type { IFileReadResult } from "@/lib/file-manager/types";

interface EditorStatusBarProps {
  fileData: IFileReadResult;
  lineCount: number;
  contentLength: number;
}

export function EditorStatusBar({
  fileData,
  lineCount,
  contentLength,
}: EditorStatusBarProps) {
  return (
    <div className="p-2 px-4 bg-[#007acc] text-white text-[11px] font-mono flex items-center justify-between select-none">
      <div className="flex items-center gap-3">
        <span>UTF-8</span>
        <span>LF</span>
        <span>{fileData.name.split(".").pop()?.toUpperCase() || "TEXT"}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>{lineCount} linhas</span>
        <span>{contentLength} caracteres</span>
        <span className="opacity-90">
          Pressione <strong>Ctrl + S</strong> para salvar
        </span>
      </div>
    </div>
  );
}
