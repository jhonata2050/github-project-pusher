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
