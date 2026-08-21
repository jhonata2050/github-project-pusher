# Dossiê Técnico: Integração DirectAdmin - Eqsam Cloud

Este documento fornece uma auditoria completa de todas as interações entre o sistema Eqsam Cloud e a API do DirectAdmin, incluindo a comprovação técnica da falha de delegação de identidade.

## 1. Auditoria de SSO e Comprovação de Identidade

Após testes A/B realizados em ambiente controlado (Incognito) e inspeção via Playwright, foi identificada uma falha crítica na delegação de identidade do DirectAdmin via API.

### Tabela de Testes e Resultados Efetivos

| Teste | Método | Usuário Solicitado (Target) | Usuário Efetivamente Autenticado | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `CMD_API_LOGIN_KEYS` | `v6lk8dp` (Cliente) | `eqsa7232` (Dono da Key) | **FALHA** |
| **B** | `CMD_API_LOGIN_KEYS` | `dfibrane` (Cliente) | `eqsa7232` (Dono da Key) | **FALHA** |
| **C** | `/api/login/url` | `v6lk8dp` (Cliente) | `eqsa7232` (Dono da Key) | **FALHA** |
| **D** | `da login-url` | `cliente_teste` | *(Simulação)* | **N/A** (Sem acesso CLI) |

**Conclusão Técnica:**
O mecanismo `CMD_API_LOGIN_KEYS` (e o moderno `/api/login/url`) via API **NÃO está honrando o parâmetro `user`** para delegação de identidade quando autenticado com uma Login Key de revendedor, a menos que a Login Key possua a permissão explícita `LKM_CREATE_URL` com capacidade de impersonação, que parece estar restrita ou ignorada pelo servidor. O servidor cria a sessão para o **dono da chave** em vez do usuário alvo.

---

## 2. Arquitetura de Integração

A integração é baseada em uma arquitetura multi-provedor utilizando o padrão **Factory**.

*   **Interface Principal:** `src/lib/hosting-provider.ts`
*   **Implementação DirectAdmin:** `src/lib/directadmin-provider.server.ts`
*   **Camada de Abstração:** `src/lib/directadmin.server.ts`

## 3. Mecanismos de Autenticação

*   **Método:** Basic Auth (`Authorization: Basic <base64(user:key)>`).
*   **Segurança:** O sistema utiliza Login Keys (Tokens) em vez de senhas de sistema.
*   **Identidade:** A falha de identidade ocorre no lado do servidor DirectAdmin, que vincula a sessão ao UID/Username da credencial de autenticação e não ao parâmetro da requisição.

## 4. Catálogo de Requisições

### 4.1. Geração de One-Time Login URL
*   **Endpoint:** `CMD_API_LOGIN_KEYS`
*   **Método:** `POST`
*   **Parâmetros:** `action=create`, `type=one_time_url`, `user=<target>`, `expiry=10m`, `uses=1`
*   **Finalidade:** Tentar gerar um acesso para o usuário específico.
*   **Tratamento:** O sistema agora valida a resposta JSON. Se o campo `user` na resposta (ou na URL gerada) não coincidir com o `targetUser`, o acesso é bloqueado preventivamente no backend.

### 4.2. Provisionamento e Gestão
*   **Endpoints:** `CMD_API_ACCOUNT_USER`, `CMD_API_SELECT_USERS`, `CMD_API_SHOW_USER_CONFIG`.
*   **Lógica:** Operações administrativas (criar, suspender, deletar) funcionam corretamente pois operam sob o contexto do revendedor. A falha reside exclusivamente no **acesso visual (SSO)**.

## 5. Próximos Passos e Recomendações

1.  **Substituição de Mecanismo:** Avaliar se o comando CLI `da login-url --user=X` pode ser executado via SSH ou se há uma restrição de ACL no DirectAdmin que impede a impersonação via Login Keys.
2.  **Validação de Cookie:** Confirmado que o navegador recebe um cookie `session` do DirectAdmin após abrir a URL, mas este cookie está vinculado ao usuário administrativo.
3.  **Integridade:** O backend Eqsam Cloud mantém o bloqueio estrito. Nenhuma URL de SSO é entregue ao cliente se a identidade confirmada pelo servidor não for exatamente a do cliente.
