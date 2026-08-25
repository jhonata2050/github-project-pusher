# Plano de Correção: Erro 401 no DirectAdmin

O erro 401 (Unauthorized) indica que as credenciais fornecidas ao DirectAdmin foram recusadas. Com base na análise, o campo "Usuário API" no cadastro do servidor não está seguindo o formato obrigatório para Login Keys.

## Alterações Propostas

### 1. Melhoria nas Mensagens de Erro
- [x] Já implementado: Atualizei `src/lib/directadmin.server.ts` para fornecer uma instrução clara quando ocorrer o erro 401, explicando o formato `USUARIO|NOME_DA_CHAVE`.

### 2. Validação e Segurança
- Implementar uma verificação no frontend/backend para alertar o administrador caso o usuário da API não contenha o caractere pipe (`|`) ao usar tokens, que é a causa mais comum de erro 401 no DirectAdmin.

## Detalhes Técnicos
- O erro reportado mostra `client_ip: 127.0.0.1`. Isso sugere que o firewall ou o próprio DirectAdmin está vendo a requisição como local, mas o motivo principal da rejeição é a falha de login.
- O valor atual configurado no banco de dados para o servidor `br01-da.eqsam.com` parece ser apenas o nome da chave, sem o prefixo do usuário (ex: `admin|`).

## Ação Recomendada para o Usuário
1. Vá em **Administração > Servidores**.
2. Edite o servidor `br01-da.eqsam.com`.
3. No campo **Usuário API**, altere para o formato `SEU_USUARIO|NOME_DA_CHAVE`.
   - Exemplo: Se seu usuário é `admin` e o nome da chave criada é `TokenEqsam`, preencha `admin|TokenEqsam`.
4. Salve e teste a conexão.
