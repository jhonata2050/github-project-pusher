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

## ⚖️ As 10 Leis Imutáveis de Engenharia (Anti-Regressão)
1. **Lei dos Webhooks (Zero Confiança no Payload):** NUNCA marque uma fatura como `paid` ou ative serviços baseado exclusivamente no corpo bruto de um webhook. Consulte ativamente a API oficial do gateway (ex: `GET /v1/payments/:id` no Mercado Pago, `/invoice/notification/` no PagHiper).
2. **Lei dos Eventos de Pagamento:** Eventos de criação (`payment.created`, `OPENPIX:CHARGE_CREATED`) indicam intenção ou emissão de QR Code pendente. Devem ser estritamente ignorados quanto à baixa.
3. **Lei do Schema Real vs Suposições:** NUNCA acesse ou presuma colunas no banco de dados sem verificar o arquivo [`docs/00-dossie-tecnico-de-engenharia/02-schema-e-arquitetura-de-dados.md`](file:///c:/Users/jhona/OneDrive/Documentos/eqsam-painel-lovable/docs/00-dossie-tecnico-de-engenharia/02-schema-e-arquitetura-de-dados.md). A coluna `services.error_message` NÃO existe (use `notes`); a coluna `servers.can_backup` NÃO existe (use `system_settings`).
4. **Lei do Fallback Resiliente:** Recursos sem suporte a colunas dedicadas no PostgreSQL devem utilizar a tabela `public.system_settings` (ex: `server_caps_{serverId}`, `vps_metrics_{vps_id}`).
5. **Lei da Blindagem do File Manager:** Qualquer rota que manipule o sistema de arquivos (`upload`, `extract`, `bundle`) deve validar e sanitizar caminhos contra *Directory Traversal* (`../`) e *Zip Slip* antes de qualquer I/O.
6. **Lei da Preservação de Fachadas (Facade Pattern):** Ao refatorar ou modularizar bibliotecas em `src/lib/`, o arquivo original DEVE permanecer como uma fachada reexportando todas as funções, garantindo 100% de retrocompatibilidade com as rotas.
7. **Lei da Persistência no Cadastro:** No cadastro de novos clientes, persista imediatamente os campos cadastrais essenciais (`phone`, `tax_id`, `country`) diretamente na tabela `public.profiles`.
8. **Lei das URLs Canônicas:** Redefinições de senha, scripts de agente VPS e webhooks devem utilizar `getCanonicalPublicUrl()`, resolvendo `APP_URL` ou `x-forwarded-host`, nunca `localhost:3000`.
9. **Lei do Teste Obrigatório:** Toda correção de bug ou nova funcionalidade crítica deve ser acompanhada de teste de regressão em `tests/regression/`.
10. **Lei do Pipeline de Homologação:** Nenhuma modificação é considerada pronta sem que o comando `npm run check-all` execute com 100% de sucesso (TypeScript 0 erros + Vitest aprovado + Supabase queries íntegras).

## 🐳 Regra Estrita de Publicação Docker (Docker Hub)
- **Repositório Compartilhado:** `jhonatavs/strefdfdf` é um repositório compartilhado com múltiplos projetos e serviços distintos do usuário (ex: `painel-lovepro-...`, `site-lovepro-...`, `painel-uaijet`, etc.).
- **PROIBIÇÃO ABSOLUTA:** **NUNCA** gerar ou fazer push de tags genéricas como `latest`, `v0`, `v1` ou similares para `jhonatavs/strefdfdf`. Fazer isso sobrescreve e quebra outros serviços em produção.
- **TAG ESPECÍFICA OBRIGATÓRIA:** Use **exclusiva e estritamente** a tag com o prefixo exato do projeto solicitado pelo usuário (ex: `jhonatavs/strefdfdf:painel-eqsam-v0` ou `painel-eqsam-v...`), sem adicionar `latest` ou outras tags genéricas.
