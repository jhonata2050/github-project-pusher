import type { IFileReadResult } from "@/lib/file-manager/types";

export interface CodeEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileData: IFileReadResult | null;
  documentRoot?: string;
  onSave: (
    path: string,
    content: string,
    expectedSha256?: string,
    force?: boolean
  ) => Promise<{ sha256: string; mtime: string }>;
  onReload: (path: string) => Promise<IFileReadResult>;
}
