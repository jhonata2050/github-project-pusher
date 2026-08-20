# Plano de Correção: Erro 401 no Gateway Woovi (AppID Inválido)

O usuário reportou um erro "Woovi: 401 - appId inválido" ao tentar gerar um QR Code Pix. Isso indica que a credencial `woovi_app_id` configurada no sistema não está sendo enviada corretamente ou está incorreta/mal formatada.

## Problemas Identificados
1.  **Credenciais Vazias/Placeholder**: Nas mensagens anteriores, foi detectado que o sistema estava salvando strings vazias ou placeholders em `system_settings`.
2.  **Formatação do AppID**: O Woovi espera o AppID diretamente no header `Authorization`. Se houver espaços ou caracteres invisíveis, a API retorna 401.
3.  **Fallback de Pagamento**: Embora exista um fallback, se o gateway prioritário (Woovi) falhar com 401, o sistema deve registrar o erro e, se possível, tentar o próximo ou instruir o usuário.

## Ações

### 1. Ajuste na Chamada da API Woovi
Refinar o envio do header `Authorization` em `src/lib/payments.server.ts` para garantir que o AppID seja limpo (trim) e não contenha placeholders.

### 2. Melhoria no Tratamento de Erro (Woovi)
Melhorar a mensagem de erro retornada para o frontend quando o erro for explicitamente de credencial, facilitando o diagnóstico pelo admin.

### 3. Validação de Credenciais no Financeiro
Garantir que ao salvar as credenciais em `src/routes/_authenticated/admin/finance.tsx`, elas sejam validadas e não permitam salvar valores que sabidamente falharão (como placeholders).

## Detalhes Técnicos

### src/lib/payments.server.ts
- Adicionar `.trim()` ao `woovi_app_id` antes de enviar.
- Verificar se o `woovi_app_id` não é um placeholder (ex: contém "APP_ID").

### src/routes/_authenticated/admin/finance.tsx
- Adicionar uma verificação visual ou aviso se o usuário tentar salvar credenciais com o texto "placeholder" ou muito curtas.

### src/lib/gateways.ts
- Refinar a função `isGatewayConfigured` para ser mais rigorosa com o Woovi.

---
**Nota:** Este erro é de configuração de API. A correção no código garantirá que o sistema envie exatamente o que o usuário digitar, mas o usuário precisará inserir uma chave válida no painel administrativo se a atual estiver expirada ou incorreta.
