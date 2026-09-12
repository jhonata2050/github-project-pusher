import React from "react";
import {
  Folder,
  FolderArchive,
  FileCode,
  FileText,
  KeyRound,
} from "lucide-react";
import type { IFileInfo } from "@/lib/file-manager/types";

export function getItemIcon(item: IFileInfo) {
  if (item.type === "directory") {
    return <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20" />;
  }
  const ext = item.name.split(".").pop()?.toLowerCase() || "";
  if (["zip", "tar", "gz", "rar", "7z"].includes(ext)) {
    return <FolderArchive className="h-5 w-5 text-amber-500" />;
  }
  if (["html", "htm"].includes(ext)) {
    return <FileCode className="h-5 w-5 text-orange-500" />;
  }
  if (["css", "scss", "sass"].includes(ext)) {
    return <FileCode className="h-5 w-5 text-sky-400" />;
  }
  if (["js", "ts", "jsx", "tsx"].includes(ext)) {
    return <FileCode className="h-5 w-5 text-amber-400" />;
  }
  if (["json"].includes(ext)) {
    return <FileCode className="h-5 w-5 text-emerald-400" />;
  }
  if (["php"].includes(ext)) {
    return <FileCode className="h-5 w-5 text-indigo-400" />;
  }
  if (["env"].includes(ext)) {
    return <KeyRound className="h-5 w-5 text-purple-400" />;
  }
  if (["md", "txt"].includes(ext)) {
    return <FileText className="h-5 w-5 text-zinc-400" />;
  }
  return <FileText className="h-5 w-5 text-primary" />;
}
