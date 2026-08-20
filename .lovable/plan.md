# Plano: Correção da URL de Webhook no Admin

O usuário relatou que o sistema estava fornecendo a URL de desenvolvimento (Preview) para configurar os webhooks, o que causa erro 401 quando os gateways tentam acessá-la de fora. O objetivo é garantir que a interface administrativa sugira a URL do projeto público.

## Alterações Propostas

### Frontend

#### Admin Finance Settings (`src/routes/_authenticated/admin/finance.tsx`)
- Alterar a lógica de geração da `defaultWebhook`.
- Atualmente, ela usa `window.location.origin`, que no ambiente de Preview retorna a URL de desenvolvimento.
- Vou modificar para verificar se existe uma configuração de `system_webhook_url` salva; caso contrário, usarei uma lógica que priorize a URL de produção se estivermos em um domínio de preview, ou manter o comportamento atual se já estivermos em produção.
- Como o sistema já tem a variável `system_webhook_url` persistida no banco, o foco será garantir que o "valor sugerido" inicial seja o correto.

## Detalhes Técnicos

### Lógica da URL Sugerida
Substituiremos:
```typescript
const defaultWebhook = typeof window !== 'undefined' ? `${window.location.origin}/api/public/webhook` : '';
```
Por algo que tente detectar a URL pública:
- Se o domínio contiver `id-preview--`, tentaremos derivar a URL pública (embora seja difícil saber o ID exato sem variáveis de ambiente específicas).
- A melhor abordagem é encorajar o usuário a salvar a URL correta uma vez. Adicionarei um aviso visual ou facilitarei a troca para a URL de produção se detectarmos que estamos no preview.

## Verificação e Testes
1. Validar se a interface administrativa exibe a URL correta.
2. Garantir que o botão de "Copiar" funciona com a URL correta.
3. Verificar se, ao salvar, o valor é persistido corretamente no banco de dados `system_settings`.
