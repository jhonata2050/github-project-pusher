import { useState, useCallback, useMemo } from "react";
import type { IFileInfo } from "@/lib/file-manager/types";
import type { FileSortBy, FileSortOrder } from "./types";

export function useFileManagerSelection(items: IFileInfo[] = []) {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<FileSortBy>("name");
  const [sortOrder, setSortOrder] = useState<FileSortOrder>("asc");
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

  // Itens filtrados e ordenados
  const filteredAndSortedItems = useMemo(() => {
    const list = [...items];

    const filtered = list.filter((item) => {
      if (!searchQuery) return true;
      return (
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.path.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });

    filtered.sort((a, b) => {
      // Pastas sempre no topo
      if (a.type === "directory" && b.type !== "directory") return -1;
      if (a.type !== "directory" && b.type === "directory") return 1;

      let comp = 0;
      if (sortBy === "name") {
        comp = a.name.localeCompare(b.name, undefined, { sensitivity: "base", numeric: true });
      } else if (sortBy === "size") {
        comp = a.size - b.size;
      } else if (sortBy === "mtime") {
        comp = new Date(a.mtime).getTime() - new Date(b.mtime).getTime();
      } else if (sortBy === "permissions") {
        comp = a.permissions.localeCompare(b.permissions);
      } else if (sortBy === "type") {
        comp = a.mimeType.localeCompare(b.mimeType);
      }
      return sortOrder === "asc" ? comp : -comp;
    });

    return filtered;
  }, [items, searchQuery, sortBy, sortOrder]);

  // Alterna seleção de arquivo
  const toggleSelect = useCallback((path: string) => {
    setSelectedPaths((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  }, []);

  // Set otimizado de caminhos selecionados para verificação O(1)
  const selectedPathsSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  // Selecionar Todos
  const isAllSelected =
    filteredAndSortedItems.length > 0 &&
    filteredAndSortedItems.every((item) => selectedPathsSet.has(item.path));
  const isSomeSelected =
    filteredAndSortedItems.some((item) => selectedPathsSet.has(item.path)) && !isAllSelected;

  const handleToggleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedPaths([]);
    } else {
      setSelectedPaths(filteredAndSortedItems.map((item) => item.path));
    }
  }, [isAllSelected, filteredAndSortedItems]);

  return {
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedPaths,
    setSelectedPaths,
    filteredAndSortedItems,
    toggleSelect,
    selectedPathsSet,
    isAllSelected,
    isSomeSelected,
    handleToggleSelectAll,
  };
}
