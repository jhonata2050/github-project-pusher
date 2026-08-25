---
name: Investigação de Privilégios Admin DirectAdmin
description: Corrigir falha que permite acesso administrativo via SSO para usuários padrão no DirectAdmin.
type: feature
---

## Objetivo
Garantir que usuários padrão (clientes) nunca acessem o painel DirectAdmin com privilégios de administrador ou revendedor, operando estritamente em nível 'user'.

## Diagnóstico Técnico
1.  **Vulnerabilidade Identificada**: O sistema utiliza chaves de login (Login Keys) geradas pelo usuário da API (`eqsa7232`). Se o comando de criação da chave não for explicitamente restrito ou se houver uma falha na delegação, o DirectAdmin pode conceder o nível de acesso do criador da chave em vez do usuário alvo.
2.  **Configuração de SSO**: No arquivo `src/lib/directadmin.server.ts`, a função `getDASession` cria a chave. Precisamos garantir que o DirectAdmin aplique as restrições de segurança do usuário `user` e que a política global do servidor não permita bypass.
3.  **Logs de Auditoria**: Utilizar o novo sistema de logs (`src/lib/system-logs.server.ts`) para capturar tentativas de escalonamento.

## Plano de Ação
1.  **Reforço no Backend (DirectAdmin API)**:
    *   Modificar a chamada de `CMD_API_LOGIN_KEYS` para incluir parâmetros de restrição explícitos (se disponíveis na API do DA para chaves delegadas).
    *   Validar o cabeçalho de autenticação para garantir que não estamos usando a conta 'admin' raiz para logins de clientes.
2.  **Validação de Segurança Multi-Camada**:
    *   Em `src/lib/security.server.ts`, adicionar uma verificação que compare o `username` solicitado com o nível de acesso retornado pelo DA (via `CMD_API_SHOW_USER_CONFIG`).
    *   Se o DA retornar que o usuário tem `usertype=admin` ou `usertype=reseller`, o SSO deve ser abortado imediatamente com log crítico.
3.  **Ajuste de Interface e Feedback**:
    *   Garantir que a cliente "Vitoria Karolina" (citada no histórico) e outros usuários similares sejam testados contra esta nova regra.
4.  **Monitoramento**:
    *   Exibir alertas no Dashboard Admin sempre que um login SSO for gerado, detalhando o nível de acesso pretendido vs real.

## Critérios de Aceite
*   Nenhum usuário cliente consegue ver o menu "Reseller Level" ou "Admin Level" no DirectAdmin após clicar em "Acessar Painel".
*   Tentativas de acessar usuários de sistema (`admin`, `root`, etc) via SSO são bloqueadas no lado do servidor Lovable.
