import type { FileManagerToolbarProps } from "./toolbar/types";
import {
  ToolbarNavigationActions,
  ToolbarBreadcrumbsSearch,
  ToolbarBatchActions,
} from "./toolbar/index";

export type { BreadcrumbSegment, FileManagerToolbarProps } from "./toolbar/types";

export function FileManagerToolbar(props: FileManagerToolbarProps) {
  return (
    <>
      <ToolbarNavigationActions
        historyIndex={props.historyIndex}
        historyLength={props.historyLength}
        currentPath={props.currentPath}
        navigateBack={props.navigateBack}
        navigateForward={props.navigateForward}
        navigateUp={props.navigateUp}
        isFetching={props.isFetching}
        onRefresh={props.onRefresh}
        onOpenNewFolder={props.onOpenNewFolder}
        onOpenNewFile={props.onOpenNewFile}
        onTriggerUpload={props.onTriggerUpload}
        showHidden={props.showHidden}
        onToggleShowHidden={props.onToggleShowHidden}
        viewMode={props.viewMode}
        onSetViewMode={props.onSetViewMode}
      />

      <ToolbarBreadcrumbsSearch
        docRoot={props.docRoot}
        currentPath={props.currentPath}
        breadcrumbSegments={props.breadcrumbSegments}
        onNavigate={props.onNavigate}
        searchQuery={props.searchQuery}
        onSearchChange={props.onSearchChange}
      />

      <ToolbarBatchActions
        selectedPaths={props.selectedPaths}
        onCopy={props.onCopy}
        onMove={props.onMove}
        onCompress={props.onCompress}
        onDeleteSelected={props.onDeleteSelected}
        deletePending={props.deletePending}
      />
    </>
  );
}
