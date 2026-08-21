# Dossiê Técnico: Integração DirectAdmin - Eqsam Cloud
Actualizado: 21/08/2026

Este documento fornece uma auditoria completa de todas as interações entre o sistema Eqsam Cloud e a API do DirectAdmin, documentando a nova estratégia de SSO.

## 1. Auditoria de SSO e Comprovação de Identidade

Após auditoria profunda, confirmou-se que o mecanismo `CMD_API_LOGIN_KEYS` falha na delegação de identidade quando utilizado via API com Login Keys de revendedor.

### Tabela de Testes e Resultados Efetivos

| Teste | Método | Usuário Solicitado (Target) | Usuário Efetivamente Autenticado | Resultado |
| :--- | :--- | :--- | :--- | :--- |
| **A** | `CMD_API_LOGIN_KEYS` | `cliente_a` | `admin` (Dono da Key) | **BLOQUEADO (Segurança)** |
| **B** | `api/login/url` | `cliente_a` | `admin` (Dono da Key) | **BLOQUEADO (Segurança)** |
| **C** | `da login-url` (CLI) | `cliente_a` | `cliente_a` | **SUCESSO (Referência)** |

**Conclusão Técnica:**
O mecanismo antigo foi desativado. A nova estratégia utiliza a API moderna (`api/login/url`) com validação estrita de identidade no backend. Se o servidor DirectAdmin não honrar a delegação e retornar uma sessão administrativa, o sistema Eqsam interrompe o fluxo e nega o acesso.

---

## 2. Arquitetura de Integração

A integração segue o padrão **Multi-Provider** para garantir isolamento e segurança.

*   **HostingProvider (Interface):** Define o método `generateClientLogin(username)`.
*   **DirectAdminProvider (Adapter):** Implementa a lógica específica utilizando `getDASession`.
*   **DirectAdmin API (Backend):** Centralizado em `src/lib/directadmin.server.ts`.

## 3. Segurança e Validação de Identidade (SSO)

O fluxo de login seguro segue estas regras obrigatórias:

1.  **Resolução por Autoridade:** O `targetUser` é resolvido no banco de dados do backend a partir do serviço do cliente autenticado. O cliente nunca fornece o username.
2.  **Sanitização Estrita:** O username passa por regex `[^a-zA-Z0-9_-]` para evitar command injection.
3.  **Blacklist de Privilégios:** Bloqueio imediato se o alvo for `admin`, `root` ou similares.
4.  **Validação Pós-Geração:** A URL gerada é inspecionada. Se contiver o username do administrador (extraído da chave de API), a requisição é abortada com erro 403.

## 4. Requisitos do Servidor DirectAdmin

Para o funcionamento deste novo mecanismo, a Login Key no servidor destino deve possuir:

*   **Permissão:** `LKM_CREATE_URL` (Crucial para impersonação).
*   **Comandos:** `api/login/url` (POST).
*   **Acesso:** `CMD_API_SHOW_USER_CONFIG` (Para verificação de existência e nível).

## 5. Logs e Auditoria

*   O sistema registra metadados da tentativa de login no `system_logs`.
*   **Proibido:** Armazenar ou logar a URL completa, hashes ou tokens de sessão.
*   **Incidentes:** Qualquer falha de identidade gera um log de nível `critical` e notifica os administradores via WhatsApp.