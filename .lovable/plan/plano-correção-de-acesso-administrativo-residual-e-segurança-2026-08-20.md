# Plano: Correção de Acesso Administrativo Residual e Segurança de Provisionamento

O objetivo deste plano é garantir que o sistema não permita o acesso administrativo indevido no DirectAdmin e que o processo de provisionamento seja robusto e seguro.

## Alterações Técnicas

### 1. Novo Módulo de Segurança
- Criar `src/lib/security.server.ts` para centralizar validações de permissões e auditoria de segurança.
- Implementar função `validateDASSORequest` para verificar se o usuário atual tem permissão sobre o `username` solicitado no servidor específico.

### 2. Reforço no Provisionamento (DirectAdmin)
- Modificar `src/lib/directadmin.server.ts`:
  - Restringir nomes de usuário de sistema (admin, root, etc.) em logins SSO.
  - Reduzir o tempo de expiração do link de login único (one-time URL) de 60 para 10 minutos.
  - Garantir a validação estrita do `targetUser` em todas as chamadas de API.

### 3. Validação de Acesso SSO
- Atualizar `src/lib/support.functions.ts`:
  - Substituir a validação inline pelo novo módulo de segurança em `getDASSOUrl`.
  - Garantir que mesmo administradores passem por verificações de sanidade ao acessar contas de clientes.

### 4. Melhorias no Fluxo de Provisionamento
- Revisar `src/lib/finance.server.ts` para garantir que, em caso de falha de provisionamento, o status permaneça `pending` e as notas técnicas sejam gravadas para auditoria imediata, evitando estados inconsistentes que possam levar a acessos manuais errôneos.

## Resultados Esperados
- Novos usuários serão provisionados estritamente como 'user'.
- O acesso SSO será validado contra a posse real do serviço no banco de dados.
- Links administrativos residuais serão inutilizados por restrições de nome de usuário e tempo de expiração reduzido.
- Tentativas de escalação de privilégio serão logadas para auditoria.

## Por que isso é importante?
Essas mudanças fecham a brecha que permitia que usuários fossem provisionados com permissões elevadas ou acessassem painéis administrativos através de links SSO mal validados ou expirados.
