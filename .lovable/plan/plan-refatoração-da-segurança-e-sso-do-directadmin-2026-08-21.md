# Plan: Refatoração da Segurança e SSO do DirectAdmin

Refatorar a integração com DirectAdmin para remover diagnósticos genéricos de permissão, aprimorar a detecção de capacidades do servidor e impedir fluxos de SSO inseguros (login como administrador).

## User Review Required

> [!IMPORTANT]
> A permissão `LKM_CREATE_URL` e o endpoint `/api/login/url` são os únicos métodos conhecidos para gerar URLs de acesso que respeitam a delegação de usuário. O sistema agora bloqueará explicitamente qualquer tentativa que resulte em login administrativo para um cliente.

## Proposed Changes

### Backend (DirectAdmin Integration)

#### [src/lib/directadmin.server.ts]
- **Detecção de Capacidades**: Implementar `getDACapabilities` para testar separadamente a disponibilidade de `CMD_API_LOGIN_KEYS`, `api/login/url` e a capacidade de criar URLs para usuários filhos.
- **Remoção de Diagnóstico Genérico**: Eliminar a mensagem fixa que solicita `LKM_CREATE_URL` em erros 403 genéricos.
- **Bloqueio de SSO Inseguro**: 
  - Remover o fallback para `CMD_API_LOGIN_KEYS` com `user=cliente` se for comprovado que ele autentica o dono da chave (revendedor).
  - Se o servidor não suportar delegação segura, retornar o erro: "O provedor DirectAdmin não permite SSO delegado para usuários desta revenda."
- **Validação de Identidade**: Manter e reforçar a verificação da URL final para garantir que o `targetUser` coincide com o usuário logado na sessão gerada.

#### [src/lib/support.functions.ts]
- Expor a nova função de diagnóstico de capacidades para o frontend.

### Frontend (Admin Interface)

#### [src/routes/_authenticated/admin/servers.tsx]
- **Atualização da UI de Ajuda**: Remover a menção obrigatória a `LKM_CREATE_URL` no modal de "Comandos Necessários".
- **Feedback de Diagnóstico**: Atualizar as mensagens de erro para refletir a falta de suporte a SSO delegado quando detectado.

## Technical Details
- Uso de `fetch` com JSON puro para `/api/login/url`.
- Testes de impersonação seguros durante a validação da conexão.
- Logs de auditoria para cada tentativa de SSO com registro do método utilizado.

## Verification Plan

### Automated Tests
- Simular resposta 404/405 em `/api/login/url` e verificar se o sistema bloqueia o acesso em vez de fazer fallback inseguro.
- Validar se a string de erro específica ("O provedor DirectAdmin não permite SSO delegado...") é retornada corretamente.

### Manual Verification
- Acessar o painel administrativo e abrir o modal de "Comandos Necessários" para verificar o novo texto.
- Testar a conexão de um servidor DirectAdmin e observar os logs de auditoria.
