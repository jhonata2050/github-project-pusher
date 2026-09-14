export interface BreadcrumbSegment {
  name: string;
  path: string;
}

export interface FileManagerToolbarProps {
  // Navegação
  historyIndex: number;
  historyLength: number;
  currentPath: string;
  navigateBack: () => void;
  navigateForward: () => void;
  navigateUp: () => void;
  // Sincronização
  isFetching: boolean;
  onRefresh: () => void;
  // Ações de criação e upload
  onOpenNewFolder: () => void;
  onOpenNewFile: () => void;
  onTriggerUpload: () => void;
  showHidden: boolean;
  onToggleShowHidden: () => void;
  viewMode: "list" | "grid";
  onSetViewMode: (mode: "list" | "grid") => void;
  // Breadcrumbs e busca
  docRoot: string;
  breadcrumbSegments: BreadcrumbSegment[];
  onNavigate: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  // Ações em massa
  selectedPaths: string[];
  onCopy: () => void;
  onMove: () => void;
  onCompress: () => void;
  onDeleteSelected: () => void;
  deletePending?: boolean | undefined;
}
