import React from "react";
import { Button } from "@/components/ui/button";

interface EditorSearchBarProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  replaceQuery: string;
  setReplaceQuery: (val: string) => void;
  onReplaceAll: () => void;
}

export function EditorSearchBar({
  searchQuery,
  setSearchQuery,
  replaceQuery,
  setReplaceQuery,
  onReplaceAll,
}: EditorSearchBarProps) {
  return (
    <div className="p-3 bg-[#2d2d2d] border-b border-zinc-800 flex flex-wrap items-center gap-2 text-xs">
      <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
        <span className="text-zinc-400 font-mono">Buscar:</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Texto a localizar..."
          className="bg-[#1e1e1e] text-white px-2.5 py-1 rounded-lg border border-zinc-700 text-xs flex-1 outline-none focus:border-primary"
        />
      </div>
      <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
        <span className="text-zinc-400 font-mono">Substituir:</span>
        <input
          type="text"
          value={replaceQuery}
          onChange={(e) => setReplaceQuery(e.target.value)}
          placeholder="Novo texto..."
          className="bg-[#1e1e1e] text-white px-2.5 py-1 rounded-lg border border-zinc-700 text-xs flex-1 outline-none focus:border-primary"
        />
      </div>
      <Button
        size="sm"
        onClick={onReplaceAll}
        disabled={!searchQuery}
        className="rounded-lg h-7 px-3 text-xs font-semibold bg-zinc-700 hover:bg-zinc-600"
      >
        Substituir Tudo
      </Button>
    </div>
  );
}
