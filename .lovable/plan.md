# Plano de Correção de Permissões DirectAdmin

O problema 401 (Não Autorizado) com o IP `34.91.200.163` indica que, embora a chave de API esteja configurada, ela possui restrições de IP ou permissões insuficientes para os comandos necessários.

## Alterações Propostas

### Backend (Lógica de Diagnóstico e Segurança)

- **Aprimorar `src/lib/directadmin.server.ts`**:
    - Atualizar a lista de comandos necessários na mensagem de erro 403 (Acesso Negado) para incluir todos os comandos críticos para provisionamento e SSO.
    - Comandos necessários: `CMD_API_PACKAGES_USER`, `CMD_API_ACCOUNT_USER`, `CMD_API_SHOW_USER_CONFIG`, `CMD_API_SELECT_USERS`, `CMD_API_LOGIN_KEYS`, `CMD_API_USER_DOMAIN_LIST`.
    - Melhorar a instrução de IP na mensagem 401 para ser mais direta sobre a necessidade de adicionar o IP `34.91.200.163` na whitelist da Login Key.

### Interface Administrativa

- **Atualizar `src/routes/_authenticated/admin/servers.tsx`**:
    - Adicionar um bloco de ajuda visual na seção de Servidores listando exatamente quais comandos devem ser marcados ao criar a Login Key no DirectAdmin.
    - Incluir um alerta de segurança recomendando a liberação do IP `34.91.200.163`.
    - Adicionar um link ou botão "Copiar Comandos Necessários" para facilitar a vida do administrador.

## Detalhes Técnicos

Os comandos específicos que a Login Key deve ter permissão são:

```text
CMD_API_PACKAGES_USER
CMD_API_ACCOUNT_USER
CMD_API_SHOW_USER_CONFIG
CMD_API_SELECT_USERS
CMD_API_LOGIN_KEYS
CMD_API_USER_DOMAIN_LIST
```

Além disso, a Login Key não deve ter restrição de IP, ou deve incluir explicitamente:
- `34.91.200.163` (Eqsam Cloud)
- `127.0.0.1` (Para casos onde o DirectAdmin está atrás de um proxy local)
