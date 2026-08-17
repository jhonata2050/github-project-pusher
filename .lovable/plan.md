
## Plano de Melhoria do Checkout e Cadastro

Este plano aborda a limpeza da interface, validações de domínio, melhorias no ciclo de faturamento, validações de cadastro e requisitos de pagamento PIX.

### 1. Limpeza da Interface (Foco no Checkout)
- **Objetivo:** Ocultar o menu lateral para novos clientes no checkout.
- **Implementação:**
  - Alterar `src/components/app/AppShell.tsx` para detectar se a rota atual é `/checkout/` e se o usuário não está logado.
  - Nessas condições, renderizar uma versão simplificada sem `aside` e com cabeçalho minimalista.

### 2. Validação de Domínio e Bloqueio de Termos Sensíveis
- **Objetivo:** Impedir domínios duplicados ou protegidos.
- **Implementação:**
  - Adicionar função `validateDomain` em `src/lib/checkout.functions.ts` que verifica a tabela `services` e uma lista de domínios bloqueados (`eqsam`, `google`, `whatsapp`, etc.).
  - Integrar essa validação no componente `src/components/checkout/StepDomain.tsx`.

### 3. Melhoria dos Ciclos de Faturamento
- **Objetivo:** Traduzir termos e exibir economia.
- **Implementação:**
  - Mapear "monthly" para "Mensal" e "annually" para "Anual".
  - Calcular a economia (ex: `(preço_mensal * 12 - preço_anual) / (preço_mensal * 12) * 100`) e exibir o valor proporcional mensal no card do ciclo anual.
  - Atualizar `src/routes/checkout.$productId.tsx`.

### 4. Validação de Cadastro e Campo WhatsApp
- **Objetivo:** Evitar e-mails duplicados e melhorar captura de contato.
- **Implementação:**
  - No `StepAuth.tsx`, verificar se o e-mail já existe no banco antes de tentar o `signUp`.
  - Integrar biblioteca de seleção de país (ou componente personalizado) para o campo WhatsApp.
  - Usar `Intl.DateTimeFormat().resolvedOptions().timeZone` ou similar para sugerir o DDI do país.

### 5. Requisitos PIX (CPF/CNPJ)
- **Objetivo:** Tornar CPF obrigatório para PIX.
- **Implementação:**
  - No `StepPayment.tsx`, se PIX for selecionado, exibir campo para CPF/CNPJ caso o perfil do usuário não o possua.
  - Validar o documento antes de chamar a criação do pedido.

### Detalhes Técnicos
- Utilização de `createServerFn` para validações que consultam o banco de dados.
- Uso de `zod` para validações de formato (CPF, E-mail, Domínio).
- Preservação do estado do checkout entre os passos.

---
**Por favor, revise o plano acima. Assim que aprovado, prosseguirei com as alterações.**
