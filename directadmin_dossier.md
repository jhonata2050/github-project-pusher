# Dossiê Técnico: Integração DirectAdmin - Eqsam Cloud

Este documento fornece uma auditoria completa de todas as interações entre o sistema Eqsam Cloud e a API do DirectAdmin.

## 1. Arquitetura de Integração

A integração é baseada em uma arquitetura multi-provedor utilizando o padrão **Factory**.

*   **Interface Principal:** `src/lib/hosting-provider.ts` (Define os métodos `createAccount`, `suspendAccount`, etc.)
*   **Implementação DirectAdmin:** `src/lib/directadmin-provider.server.ts`
*   **Camada de Abstração de Baixo Nível:** `src/lib/directadmin.server.ts` (Responsável pelas chamadas HTTP brutas, tratamento de erros e segurança).
*   **Gerenciamento de Instâncias:** `src/lib/hosting-provider-factory.server.ts` (Instancia o provedor correto com base no tipo do servidor).

## 2. Mecanismos de Autenticação

O sistema utiliza **Login Keys** (Tokens de API) do DirectAdmin para todas as operações.

*   **Formato Interno:** O sistema armazena o usuário da API no formato `USUARIO|NOME_DA_CHAVE` e o token no campo de senha.
*   **Método HTTP:** Basic Auth (`Authorization: Basic <base64(user:key)>`).
*   **Segurança de Impersonação:** Para ações de cliente (SSO), o sistema utiliza o comando `CMD_API_LOGIN_KEYS` com o parâmetro `user` para gerar uma `one_time_url` restrita ao usuário final.

## 3. Catálogo de Requisições

### 3.1. Teste de Conexão e Listagem de Pacotes
*   **Endpoint:** `CMD_API_PACKAGES_USER`
*   **Método:** `GET`
*   **Parâmetros:** `json=yes`
*   **Finalidade:** Validar se as credenciais estão corretas e listar os planos disponíveis no servidor.
*   **Localização:** `src/lib/directadmin.server.ts` -> `getDAPackages()`
*   **Tratamento:** Normaliza o objeto de resposta para extrair uma lista de strings (nomes dos pacotes).

### 3.2. Criação de Conta (Provisionamento)
*   **Endpoint:** `CMD_API_ACCOUNT_USER`
*   **Método:** `POST`
*   **Parâmetros:**
    *   `action=create`, `add=Submit`
    *   `username`: Nome de usuário gerado.
    *   `email`: Email do cliente.
    *   `passwd`, `passwd2`: Senha forte de 24 caracteres gerada via `crypto.getRandomValues`.
    *   `domain`: Domínio principal do serviço.
    *   `package`: Nome do pacote DirectAdmin.
    *   `ip`: IP do servidor.
    *   `notify=no`
*   **Finalidade:** Provisionar uma nova conta de hospedagem após o pagamento da fatura.
*   **Localização:** `src/lib/directadmin.server.ts` -> `createDAAccount()`
*   **Tratamento:** Verifica `error: 1` no JSON de retorno para capturar falhas de limite de disco, domínio duplicado ou recursos insuficientes.

### 3.3. Suspensão e Reativação
*   **Endpoint:** `CMD_API_SELECT_USERS`
*   **Método:** `POST`
*   **Parâmetros:**
    *   `location=users`
    *   `suspend=Suspend` (ou `Unsuspend` para reativar)
    *   `select0`: Username do cliente.
*   **Finalidade:** Bloquear acesso em caso de inadimplência ou desbloquear após pagamento.
*   **Localização:** `src/lib/directadmin.server.ts` -> `suspendDAAccount()` / `DirectAdminProvider.unsuspendAccount()`

### 3.4. Exclusão de Conta
*   **Endpoint:** `CMD_API_SELECT_USERS`
*   **Método:** `POST`
*   **Parâmetros:**
    *   `location=users`
    *   `delete=Delete`
    *   `select0`: Username do cliente.
*   **Finalidade:** Remover permanentemente a conta do servidor.
*   **Localização:** `src/lib/directadmin.server.ts` -> `deleteDAAccount()`

### 3.5. Verificação de Configuração e Existência (Auditoria)
*   **Endpoint:** `CMD_API_SHOW_USER_CONFIG`
*   **Método:** `GET`
*   **Parâmetros:** `user=<username>`
*   **Finalidade:** Verificar se um usuário existe e validar seu `usertype` (garantindo que seja nível `user`).
*   **Localização:** `src/lib/directadmin.server.ts` -> `checkDAUserExists()`
*   **Segurança:** Utilizado antes de qualquer SSO para evitar "conflito de domínio" entre revendedores.

### 3.6. Geração de Sessão SSO (Acesso ao Painel)
*   **Endpoint:** `CMD_API_LOGIN_KEYS`
*   **Método:** `POST`
*   **Parâmetros:**
    *   `action=create`, `type=one_time_url`
    *   `user`: O usuário do cliente (Impersonação).
    *   `expiry=10m`
    *   `uses=1` (Chave descartável).
    *   `redirect-url`: URL interna do DA (opcional).
*   **Finalidade:** Gerar um link de login automático para o cliente sem expor senhas.
*   **Localização:** `src/lib/directadmin.server.ts` -> `getDASession()`
*   **Validação Crítica:** O sistema compara o `targetUser` solicitado com o campo `user` retornado na resposta da API. Se houver divergência (ex: o DA tentar logar como o dono da chave mestre), a requisição é abortada e um log de segurança crítico é gerado.

## 4. Estrutura de Tratamento de Respostas

Toda chamada à API passa pela função `callDA`, que implementa:

1.  **Forçamento de JSON:** Adiciona `json=yes` para garantir respostas previsíveis.
2.  **Tratamento de Status HTTP:**
    *   `401`: Orienta sobre formato `USUARIO|CHAVE` e Whitelist de IP.
    *   `403`: Detecta bloqueios do Imunify360 ou falta de comandos permitidos na Login Key.
3.  **Parser de Erro Interno:** Mesmo com HTTP 200, a API do DA pode retornar `{ error: "1", text: "..." }`. O sistema detecta isso e lança uma exceção com os detalhes.
4.  **Normalização de Hostname:** Garante que a comunicação ocorra sempre via HTTPS na porta `2222` (ou porta customizada se especificada).

## 5. Auditoria e Logs

Todas as interações sensíveis são registradas na tabela `public.audit_logs` e `public.system_logs`:
*   **Categoria `directadmin`:** Logs de provisionamento e mudanças de status.
*   **Categoria `security`:** Tentativas de escalonamento de privilégios ou falhas de identidade no SSO.
