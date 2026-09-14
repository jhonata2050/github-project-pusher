import React from "react";
import {
  FolderOpen,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
} from "lucide-react";
import { CodeEditorModal } from "./CodeEditorModal";
import { ChmodModal } from "./ChmodModal";
import { FilePropertiesModal } from "./FilePropertiesModal";
import { FileRowItem } from "./FileManagerItemRow";
import { FileManagerToolbar } from "./FileManagerToolbar";
import { FileManagerDropzone } from "./FileManagerDropzone";
import { FileManagerDialogs } from "./FileManagerDialogs";
import { useFileManager } from "./hooks/useFileManager";

export interface FileManagerViewProps {
  appId: string;
  containerRoot?: string | undefined;
}

export function FileManagerView({ appId, containerRoot }: FileManagerViewProps) {
  const fm = useFileManager({ appId, containerRoot });

  return (
    <div className="space-y-4">
      {/* Barra de Ferramentas, Breadcrumbs e Ações em Massa */}
      <FileManagerToolbar
        historyIndex={fm.historyIndex}
        historyLength={fm.history.length}
        currentPath={fm.currentPath}
        navigateBack={fm.navigateBack}
        navigateForward={fm.navigateForward}
        navigateUp={fm.navigateUp}
        isFetching={fm.isFetching}
        onRefresh={fm.handleRefreshFiles}
        onOpenNewFolder={() => fm.setIsNewFolderModalOpen(true)}
        onOpenNewFile={() => fm.setIsNewFileModalOpen(true)}
        onTriggerUpload={() => fm.fileInputRef.current?.click()}
        showHidden={fm.showHidden}
        onToggleShowHidden={() => fm.setShowHidden((p) => !p)}
        viewMode={fm.viewMode}
        onSetViewMode={fm.setViewMode}
        docRoot={fm.docRoot}
        breadcrumbSegments={fm.breadcrumbSegments}
        onNavigate={fm.navigateTo}
        searchQuery={fm.searchQuery}
        onSearchChange={fm.setSearchQuery}
        selectedPaths={fm.selectedPaths}
        onCopy={() => {
          fm.setMoveCopyAction("copy");
          fm.setTargetDirectoryInput(fm.currentPath);
          fm.setIsMoveCopyModalOpen(true);
        }}
        onMove={() => {
          fm.setMoveCopyAction("move");
          fm.setTargetDirectoryInput(fm.currentPath);
          fm.setIsMoveCopyModalOpen(true);
        }}
        onCompress={() => {
          const zipName = fm.currentPath ? `${fm.currentPath.split("/").pop()}.zip` : "pacote.zip";
          fm.setCompressArchiveName(zipName);
          fm.setIsCompressModalOpen(true);
        }}
        onDeleteSelected={() => {
          fm.setDeleteConfirmState({
            isOpen: true,
            paths: fm.selectedPaths,
            displayName: `${fm.selectedPaths.length} item(ns) selecionados`,
          });
        }}
        deletePending={fm.deleteMutation.isPending}
      />

      {/* Área de Listagem de Arquivos */}
      <div className="border rounded-3xl bg-card overflow-hidden shadow-sm">
        {/* Cabeçalho da Tabela */}
        <div className="p-3 px-6 bg-muted/40 border-b flex items-center justify-between text-xs font-bold text-muted-foreground select-none">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={fm.handleToggleSelectAll}
              className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
            >
              {fm.isAllSelected ? (
                <CheckSquare className="h-4 w-4 text-primary" />
              ) : fm.isSomeSelected ? (
                <MinusSquare className="h-4 w-4 text-primary" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground/60" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (fm.sortBy === "name") fm.setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else { fm.setSortBy("name"); fm.setSortOrder("asc"); }
              }}
              className="hover:text-foreground transition-colors flex items-center gap-1 font-bold"
            >
              <span>Nome do Arquivo / Pasta</span>
              {fm.sortBy === "name" && (fm.sortOrder === "asc" ? "↑" : "↓")}
            </button>
          </div>

          <div className="flex items-center gap-8 text-right shrink-0">
            <button
              type="button"
              onClick={() => {
                if (fm.sortBy === "size") fm.setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else { fm.setSortBy("size"); fm.setSortOrder("asc"); }
              }}
              className="hover:text-foreground transition-colors hidden sm:block w-24"
            >
              Tamanho {fm.sortBy === "size" && (fm.sortOrder === "asc" ? "↑" : "↓")}
            </button>

            <button
              type="button"
              onClick={() => {
                if (fm.sortBy === "permissions") fm.setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else { fm.setSortBy("permissions"); fm.setSortOrder("asc"); }
              }}
              className="hover:text-foreground transition-colors hidden md:block w-20"
            >
              Permissão {fm.sortBy === "permissions" && (fm.sortOrder === "asc" ? "↑" : "↓")}
            </button>

            <button
              type="button"
              onClick={() => {
                if (fm.sortBy === "mtime") fm.setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                else { fm.setSortBy("mtime"); fm.setSortOrder("asc"); }
              }}
              className="hover:text-foreground transition-colors hidden lg:block w-32"
            >
              Modificado {fm.sortBy === "mtime" && (fm.sortOrder === "asc" ? "↑" : "↓")}
            </button>

            <span className="w-36 text-center">Ações</span>
          </div>
        </div>

        {/* Conteúdo de Linhas de Arquivos */}
        <div className="divide-y">
          {fm.isLoading ? (
            <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs font-semibold">Consultando filesystem real do servidor...</p>
            </div>
          ) : fm.filteredAndSortedItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-2">
              <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/40" />
              <p className="text-sm font-semibold">Nenhum arquivo encontrado neste diretório.</p>
              <p className="text-xs">Crie um novo arquivo, pasta ou faça upload abaixo.</p>
            </div>
          ) : (
            fm.filteredAndSortedItems.map((item) => (
              <FileRowItem
                key={item.path}
                item={item}
                isSelected={fm.selectedPathsSet.has(item.path)}
                onToggleSelect={fm.toggleSelect}
                onNavigate={fm.navigateTo}
                onOpenFileForEdit={fm.handleOpenFileForEdit}
                onOpenChmod={fm.handleOpenChmod}
                onOpenExtract={fm.handleOpenExtract}
                onOpenRename={fm.handleOpenRename}
                onDownload={fm.handleDownloadFile}
                onOpenProperties={fm.handleOpenProperties}
                onDelete={fm.handleDeleteSingle}
              />
            ))
          )}
        </div>

        {/* Dropzone de Upload */}
        <FileManagerDropzone
          fileInputRef={fm.fileInputRef}
          isUploading={fm.isUploading}
          uploadProgress={fm.uploadProgress}
          uploadStatusText={fm.uploadStatusText}
          docRoot={fm.docRoot}
          currentPath={fm.currentPath}
          onUploadFiles={fm.handleUploadFiles}
        />
      </div>

      {/* Modais de Ações (Novo Arquivo, Pasta, Renomear, Mover/Copiar, Compactar, Extrair, Job, Exclusão) */}
      <FileManagerDialogs
        docRoot={fm.docRoot}
        currentPath={fm.currentPath}
        isNewFileModalOpen={fm.isNewFileModalOpen}
        setIsNewFileModalOpen={fm.setIsNewFileModalOpen}
        newFileName={fm.newFileName}
        setNewFileName={fm.setNewFileName}
        onCreateFile={(name) => fm.createFileMutation.mutate(name)}
        createFilePending={fm.createFileMutation.isPending}
        isNewFolderModalOpen={fm.isNewFolderModalOpen}
        setIsNewFolderModalOpen={fm.setIsNewFolderModalOpen}
        newFolderName={fm.newFolderName}
        setNewFolderName={fm.setNewFolderName}
        onCreateFolder={(name) => fm.createFolderMutation.mutate(name)}
        createFolderPending={fm.createFolderMutation.isPending}
        isRenameModalOpen={fm.isRenameModalOpen}
        setIsRenameModalOpen={fm.setIsRenameModalOpen}
        renameTarget={fm.renameTarget}
        renameNewName={fm.renameNewName}
        setRenameNewName={fm.setRenameNewName}
        onRename={(oldPath, newName) => fm.renameMutation.mutate({ oldPath, newName })}
        renamePending={fm.renameMutation.isPending}
        isMoveCopyModalOpen={fm.isMoveCopyModalOpen}
        setIsMoveCopyModalOpen={fm.setIsMoveCopyModalOpen}
        moveCopyAction={fm.moveCopyAction}
        selectedPathsCount={fm.selectedPaths.length}
        targetDirectoryInput={fm.targetDirectoryInput}
        setTargetDirectoryInput={fm.setTargetDirectoryInput}
        onMoveCopy={() => {
          if (fm.moveCopyAction === "move") {
            fm.moveMutation.mutate({ paths: fm.selectedPaths, targetDir: fm.targetDirectoryInput.trim() });
          } else {
            fm.copyMutation.mutate({ paths: fm.selectedPaths, targetDir: fm.targetDirectoryInput.trim() });
          }
        }}
        moveCopyPending={fm.moveMutation.isPending || fm.copyMutation.isPending}
        isCompressModalOpen={fm.isCompressModalOpen}
        setIsCompressModalOpen={fm.setIsCompressModalOpen}
        compressArchiveName={fm.compressArchiveName}
        setCompressArchiveName={fm.setCompressArchiveName}
        onCompress={(archiveName) => fm.handleStartCompressJob(fm.selectedPaths, archiveName)}
        compressRunning={fm.activeJob?.status === "running"}
        isExtractConflictModalOpen={fm.isExtractConflictModalOpen}
        setIsExtractConflictModalOpen={fm.setIsExtractConflictModalOpen}
        pendingExtractPath={fm.pendingExtractPath}
        onStartExtractJob={fm.handleStartExtractJob}
        onCancelExtract={() => {
          fm.setIsExtractConflictModalOpen(false);
          fm.setPendingExtractPath(null);
        }}
        isJobModalOpen={fm.isJobModalOpen}
        activeJob={fm.activeJob}
        onCancelActiveJob={fm.handleCancelActiveJob}
        deleteConfirmState={fm.deleteConfirmState}
        setDeleteConfirmState={fm.setDeleteConfirmState}
        onConfirmDelete={(paths) => fm.deleteMutation.mutate(paths)}
      />

      {/* Modais Especializados de Edição de Código, Permissões e Propriedades */}
      <CodeEditorModal
        isOpen={fm.isEditorOpen}
        onClose={() => fm.setIsEditorOpen(false)}
        fileData={fm.activeEditorFile}
        documentRoot={fm.docRoot}
        onSave={fm.handleSaveEditorContent}
        onReload={fm.handleReloadEditorFile}
      />

      <ChmodModal
        isOpen={fm.isChmodOpen}
        onClose={() => {
          fm.setIsChmodOpen(false);
          fm.setActiveChmodFile(null);
        }}
        file={fm.activeChmodFile}
        onSave={async (path, modeOctal) => {
          await fm.chmodMutation.mutateAsync({ path, modeOctal });
        }}
        isLoading={fm.chmodMutation.isPending}
      />

      <FilePropertiesModal
        isOpen={fm.isPropertiesOpen}
        onClose={() => {
          fm.setIsPropertiesOpen(false);
          fm.setActivePropertiesFile(null);
        }}
        file={fm.activePropertiesFile}
        documentRoot={fm.docRoot}
      />
    </div>
  );
}
