import type { RefObject, ChangeEvent } from "react";

export interface DatabaseConfigInfo {
  url?: string | undefined;
  publishableKey?: string | undefined;
  hasServiceRole?: boolean | undefined;
}

export interface DatabaseUserItem {
  id: string;
  full_name?: string | null | undefined;
  email?: string | null | undefined;
  status?: string | null | undefined;
  created_at?: string | null | undefined;
  [key: string]: any;
}

export interface DatabaseInfoData {
  config: DatabaseConfigInfo;
  users: DatabaseUserItem[];
}

export interface ServerBackupItem {
  folderName: string;
  createdAt: string | Date;
  totalFiles: number;
  totalRecords: number;
  summary?: any;
  [key: string]: any;
}

export interface DatabaseHeaderProps {
  importingFile: boolean;
  isImportPending: boolean;
  isServerBackupPending: boolean;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onTriggerServerBackup: () => void;
}

export interface DatabaseBackupsTabProps {
  serverBackups: ServerBackupItem[] | undefined;
  isBackupsLoading: boolean;
  isExportPending: boolean;
  onExport: () => void;
  onRefetchBackups: () => void;
  onTriggerServerBackup: () => void;
}

export interface DatabaseConnectionTabProps {
  config: DatabaseConfigInfo | undefined;
  copiedKey: string | null;
  onCopy: (text: string, key: string) => void;
}

export interface DatabaseUsersTabProps {
  users: DatabaseUserItem[] | undefined;
}
