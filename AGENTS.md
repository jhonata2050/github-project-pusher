<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Regras e Diretrizes do Projeto (Memória Persistente)

## 🛡️ Política de Backup Automático do Banco de Dados
- **Frequência:** A cada 3 horas.
- **Destino:** Diretório [`backups/backup-YYYY-MM-DDTHH-mm-ss/`](file:///c:/Users/jhona/OneDrive/Documentos/github-project-pusher/backups) no diretório raiz do projeto.
- **Execução:**
  - Manualmente / Script: `npm run backup` ou `node scripts/backup-database.mjs`
  - Modo contínuo (daemon): `node scripts/backup-database.mjs --daemon`
  - Agendador do Antigravity (Cron): `0 */3 * * *`
- **Conteúdo salvo:** Dump JSON e sumário de integridade de todas as tabelas públicas (`profiles`, `products`, `services`, `invoices`, `tickets`, `audit_logs`, etc.).

## 🧠 Análise Estrutural Prévia Obrigatória (Codebase Memory)
- **Regra Geral:** Antes de realizar qualquer alteração de código, refatoração, correção de bug ou nova funcionalidade, execute SEMPRE uma análise prévia utilizando o grafo de conhecimento `codebase-memory`.
- **Procedimento Padrão Pré-Edição:**
  1. **Localização e Contexto:** Usar `search_graph` ou `get_code_snippet` para inspecionar os símbolos e trechos exatos afetados.
  2. **Mapeamento de Dependências:** Usar `trace_path(direction="both")` para identificar quem chama o símbolo e o que ele chama, prevenindo quebras em cadeia e regressões.
  3. **Análise de Impacto:** Usar `detect_changes()` para avaliar o risco e escopo antes de finalizar modificações.
  4. **Consulta Rápida:** Caso necessário, consultar o visualizador 3D em `http://localhost:9749` ou executar consultas estruturais via CLI / ferramentas MCP.
