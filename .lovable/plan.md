# Plano para resolver o erro SUPABASE_SERVICE_ROLE_KEY

O erro ocorre porque as funções de auditoria em `src/lib/audit.functions.ts` tentam usar `supabaseAdmin` (que requer a chave de serviço secreta) para registrar logs em cada tentativa de login ou registro. No Lovable Cloud, a chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`) não fica disponível no ambiente de execução do servidor para proteger o banco de dados.

## Alterações propostas

### Frontend / Lógica de Negócio
- Modificar `src/lib/audit.functions.ts` para usar o cliente Supabase padrão com permissões de usuário (RLS) em vez do `supabaseAdmin`, ou remover a dependência da chave de serviço para operações de log se não forem críticas para o fluxo de autenticação imediato.
- Como `logPublicAuthEvent` e `logSessionEvent` são usados na rota `/auth`, eles causam o erro antes mesmo do usuário logar. Vou ajustar essas funções para falharem silenciosamente (apenas log de console no servidor) quando a chave administrativa estiver ausente, ou migrar para logs via RLS se a tabela `audit_logs` permitir.

### Detalhes Técnicos
1. Editar `src/lib/audit.functions.ts`:
   - Adicionar uma verificação para a disponibilidade do `supabaseAdmin`.
   - Garantir que falhas no registro de auditoria não interrompam o fluxo principal de autenticação.
2. Verificar se a tabela `audit_logs` possui políticas de RLS que permitam inserção por usuários autenticados (ou anon para eventos públicos).

## Próximos Passos
- Implementar o tratamento de erro em `src/lib/audit.functions.ts`.
- Validar se o erro desaparece na tela de login.
