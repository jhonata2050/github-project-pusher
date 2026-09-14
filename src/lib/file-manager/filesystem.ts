/**
 * Motor de Filesystem do File Manager (Fachada Retrocompatível)
 * 
 * Mantém 100% de compatibilidade retroativa com rotas e bibliotecas existentes (Lei #6 de Engenharia),
 * delegando as operações para os submódulos especializados sob `src/lib/file-manager/fs/`.
 */

export * from "./fs/index.ts";
