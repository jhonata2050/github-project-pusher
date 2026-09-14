import React from "react";
import {
  NewItemDialogs,
  RenameDialog,
  MoveCopyDialog,
  CompressDialog,
  ExtractConflictDialog,
  JobProgressDialog,
  DeleteConfirmDialog,
  type FileManagerDialogsProps,
} from "./dialogs";

export { type FileManagerDialogsProps };

export function FileManagerDialogs(props: FileManagerDialogsProps) {
  return (
    <>
      <NewItemDialogs
        docRoot={props.docRoot}
        currentPath={props.currentPath}
        isNewFileModalOpen={props.isNewFileModalOpen}
        setIsNewFileModalOpen={props.setIsNewFileModalOpen}
        newFileName={props.newFileName}
        setNewFileName={props.setNewFileName}
        onCreateFile={props.onCreateFile}
        createFilePending={props.createFilePending}
        isNewFolderModalOpen={props.isNewFolderModalOpen}
        setIsNewFolderModalOpen={props.setIsNewFolderModalOpen}
        newFolderName={props.newFolderName}
        setNewFolderName={props.setNewFolderName}
        onCreateFolder={props.onCreateFolder}
        createFolderPending={props.createFolderPending}
      />

      <RenameDialog
        isRenameModalOpen={props.isRenameModalOpen}
        setIsRenameModalOpen={props.setIsRenameModalOpen}
        renameTarget={props.renameTarget}
        renameNewName={props.renameNewName}
        setRenameNewName={props.setRenameNewName}
        onRename={props.onRename}
        renamePending={props.renamePending}
      />

      <MoveCopyDialog
        docRoot={props.docRoot}
        isMoveCopyModalOpen={props.isMoveCopyModalOpen}
        setIsMoveCopyModalOpen={props.setIsMoveCopyModalOpen}
        moveCopyAction={props.moveCopyAction}
        selectedPathsCount={props.selectedPathsCount}
        targetDirectoryInput={props.targetDirectoryInput}
        setTargetDirectoryInput={props.setTargetDirectoryInput}
        onMoveCopy={props.onMoveCopy}
        moveCopyPending={props.moveCopyPending}
      />

      <CompressDialog
        isCompressModalOpen={props.isCompressModalOpen}
        setIsCompressModalOpen={props.setIsCompressModalOpen}
        selectedPathsCount={props.selectedPathsCount}
        compressArchiveName={props.compressArchiveName}
        setCompressArchiveName={props.setCompressArchiveName}
        onCompress={props.onCompress}
        compressRunning={props.compressRunning}
      />

      <ExtractConflictDialog
        docRoot={props.docRoot}
        currentPath={props.currentPath}
        isExtractConflictModalOpen={props.isExtractConflictModalOpen}
        setIsExtractConflictModalOpen={props.setIsExtractConflictModalOpen}
        pendingExtractPath={props.pendingExtractPath}
        onStartExtractJob={props.onStartExtractJob}
        onCancelExtract={props.onCancelExtract}
      />

      <JobProgressDialog
        isJobModalOpen={props.isJobModalOpen}
        activeJob={props.activeJob}
        onCancelActiveJob={props.onCancelActiveJob}
      />

      <DeleteConfirmDialog
        deleteConfirmState={props.deleteConfirmState}
        setDeleteConfirmState={props.setDeleteConfirmState}
        onConfirmDelete={props.onConfirmDelete}
      />
    </>
  );
}
