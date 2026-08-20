# Plano de Correção: Falha de Provisionamento e Segurança de SSO

Este plano visa resolver a falha crítica onde clientes não provisionados ou inexistentes no DirectAdmin conseguem acessar o painel administrativo através do redirecionamento de SSO (Single Sign-On), além de corrigir a causa raiz do não provisionamento.

## Problema Identificado
1.  **Falha de Provisionamento:** O serviço é ativado no sistema, mas a criação da conta no DirectAdmin falha ou não ocorre, deixando o serviço em um estado inconsistente.
2.  **Redirecionamento Indevido de SSO:** Quando o sistema tenta gerar uma URL de SSO para um usuário que não existe no DirectAdmin, a API do DirectAdmin pode retornar um erro ou redirecionar para a página de login/admin do servidor. O sistema atual não valida se a conta realmente existe antes de tentar o SSO e não trata corretamente falhas de redirecionamento.
3.  **Privilégios de Admin:** A exposição da tela de login do DirectAdmin (que é a mesma do Admin) é um risco de segurança.

## Ações Propostas

### 1. Reforço no Provisionamento
*   **Validação de Resposta da API:** Ajustar `src/lib/directadmin.server.ts` para garantir que o sucesso na criação da conta seja validado rigorosamente.
*   **Logs Detalhados:** Melhorar a captura de erros em `src/lib/finance.server.ts` durante o `processProvisioning` para identificar por que a conta da cliente `vitoria karolina` falhou.

### 2. Validação Prévia ao SSO
*   **Checagem de Existência:** Modificar `src/lib/directadmin.server.ts` para incluir uma função `checkDAUserExists` que verifica se o usuário realmente existe no servidor antes de solicitar o token de SSO.
*   **Bloqueio de SSO Inconsistente:** Impedir a geração de URL de SSO em `src/lib/security.server.ts` se o usuário não for encontrado no servidor remoto, mesmo que o banco de dados local diga que ele está ativo.

### 3. Fluxo de Erro Seguro
*   **Tratamento de Exceções no SSO:** Alterar `getDASession` para capturar falhas da API e retornar erros claros ao invés de URLs que podem levar ao painel de login administrativo.
*   **Interface de Erro Amigável:** Garantir que o componente de frontend (`src/lib/support.functions.ts` e quem o chama) trate o erro e mostre uma mensagem de "Serviço em Manutenção" ou "Erro de Provisionamento" ao invés de redirecionar o navegador.

### 4. Correção e Teste (Vitoria Karolina)
*   Provisionar manualmente ou via re-tentativa a conta da cliente no DirectAdmin.
*   Validar o acesso dela como cliente comum.

## Detalhes Técnicos
*   **Arquivo `src/lib/directadmin.server.ts`:** Adicionar comando `CMD_API_SHOW_USER_CONFIG` para validar existência.
*   **Arquivo `src/lib/security.server.ts`:** Integrar a validação remota na função `validateDASSORequest`.
*   **Arquivo `src/lib/finance.server.ts`:** Ajustar o tratamento de erros no loop de provisionamento.

## Segurança
*   Nunca redirecionar para o hostname do servidor se a autenticação falhar.
*   Notificar administradores via WhatsApp imediatamente se uma inconsistência for detectada durante uma tentativa de SSO.
