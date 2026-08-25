# Plano de Correção e Padronização: Integração DirectAdmin API e SSO

Este plano detalha as alterações necessárias para alinhar a integração do DirectAdmin com as melhores práticas de segurança e a documentação oficial, separando claramente a autenticação da API (via Login Keys) do mecanismo de SSO (One-Time Login URL).

## Alterações de Design e Lógica

### 1. Refatoração da Autenticação da API
Atualmente, o sistema utiliza o formato `USER|KEY` diretamente no cabeçalho de autenticação. De acordo com a regra fundamental, esse formato deve ser apenas uma convenção interna.
- O backend irá separar o `api_user` (ex: `admin|Token`) em `username` (`admin`) e `password` (`Token`) antes de realizar chamadas de API.
- A autenticação passará a usar estritamente o padrão HTTP Basic Authentication com os valores separados.

### 2. Separação entre Login Key e SSO
O sistema deixará de tratar a One-Time Login URL como uma credencial de API.
- **API**: Continuará usando a Login Key salva nas configurações do servidor.
- **SSO**: Utilizará o comando oficial (`CMD_API_LOGIN_KEYS` com `type=one_time_url`) para gerar um hash temporário, redirecionando o cliente para a URL gerada pelo DirectAdmin.

### 3. Melhoria na Segurança do Backend
- O frontend nunca terá acesso direto à Login Key administrativa.
- Todas as validações de privilégio (evitar escalonamento para contas de sistema como `root` ou `admin`) serão reforçadas no servidor.

## Detalhes Técnicos

### Arquivos afetados:
- `src/lib/directadmin.server.ts`:
    - Atualização da função `callDA` para separar o `apiUser` pelo caractere `|`.
    - Ajuste no cabeçalho `Authorization` para refletir o usuário real e a chave como senha.
    - Manutenção da compatibilidade com o formato `USER|KEY` no banco de dados para evitar quebra de configurações existentes.
- `src/lib/security.server.ts`:
    - Reforço das listas de usuários restritos.
- `src/routes/_authenticated/admin/servers.tsx`:
    - Atualização das dicas visuais para os administradores, deixando claro que o formato `USER|KEY` é apenas para organização da aplicação e não o username literal enviado ao servidor.

### Fluxo de Validação:
1. Testar conexão com um servidor configurado no formato `usuario|chave`.
2. Validar que o DirectAdmin recebe o `usuario` como username e a `chave` como password.
3. Verificar se o SSO gera uma URL de uso único (`One-Time URL`) válida.

---
Vou prosseguir com a implementação assim que o plano for aprovado.
