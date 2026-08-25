# Plano de Importação do Repositório GitHub

Vou importar o código do repositório `host-boss-buddy` para este projeto. O repositório já foi clonado para `/tmp/host-boss-buddy` e verificado.

## Passos

1. **Sincronizar Arquivos**: Copiar todos os arquivos do repositório clonado para a raiz do projeto atual, preservando a estrutura de pastas (`src`, `public`, `supabase`, etc.).
2. **Atualizar Dependências**: Mesclar as dependências do `package.json` do repositório com as do projeto atual e executar a instalação.
3. **Limpeza**: Remover arquivos temporários da clonagem.

## Detalhes Técnicos

- Utilizarei `cp -r` para a cópia dos arquivos.
- O arquivo `package.json` será atualizado para garantir que todas as bibliotecas necessárias (como `@supabase/supabase-js` e `@lovable.dev/cloud-auth-js`) estejam presentes.
- Como o projeto usa TanStack Start, a estrutura de rotas em `src/routes` será mantida para que o Vite reconstrua a árvore de rotas automaticamente.
