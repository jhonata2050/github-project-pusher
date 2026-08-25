# Plano de Correção Crítica: Identidade SSO DirectAdmin

O usuário relatou que, apesar das proteções anteriores, os clientes ainda conseguem acessar o DirectAdmin como `admin`. A causa provável é que a requisição `CMD_API_LOGIN_KEYS` está retornando uma URL para o usuário da chave (admin) em vez do usuário alvo, e o sistema não está detectando isso porque a resposta não está vindo em formato JSON (faltando o campo `user` para validação).

## Alterações Propostas

### 1. Reforço na Comunicação com a API (`src/lib/directadmin.server.ts`)
- Alterar `callDA` para incluir `json=yes` em todas as requisições (incluindo `POST`), garantindo que a resposta contenha metadados estruturados.
- Melhorar o log de auditoria para capturar exatamente o que o DirectAdmin está retornando antes de entregar a URL ao cliente.

### 2. Validação Estrita de Identidade no SSO (`src/lib/directadmin.server.ts`)
- Em `getDASession`, tornar a verificação do campo `user` na resposta **obrigatória**.
- Se o DirectAdmin retornar uma resposta sem o campo `user` ou com um usuário diferente do solicitado, o acesso será bloqueado com um erro fatal de segurança.
- Adicionar logs detalhados de "Mismatched Identity" no banco de dados para depuração.

### 3. Ajuste no Fluxo de Requisição (`src/lib/directadmin.server.ts`)
- Garantir que o parâmetro `user` seja enviado corretamente no corpo da requisição POST.
- Adicionar redundância na verificação: se a resposta vier em formato de query string (fallback), o sistema tentará extrair o usuário ou bloqueará se for ambíguo.

## Detalhes Técnicos
- **Arquivo:** `src/lib/directadmin.server.ts`
- **Função `callDA`:** Adicionar `params.json = 'yes'` antes do envio.
- **Função `getDASession`:**
  - Validar `result.user === targetUser`.
  - Se `result.user` for undefined, logar erro crítico e bloquear.
  - Isso forçará os administradores a configurarem as Login Keys corretamente com permissão de impersonação, pois o sistema não aceitará mais URLs "silenciosas" que podem levar ao usuário admin.

## Verificação
- Simular uma resposta da API do DirectAdmin que omite o usuário ou retorna o usuário errado e confirmar que o sistema bloqueia o acesso.
- Validar via logs de auditoria (`DA-SSO-Audit`) que o payload enviado e recebido está íntegro.
