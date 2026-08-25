# Plano de Refatoração: Fluxo de Checkout por Tipo de Produto

O objetivo é implementar um fluxo de checkout dinâmico e guiado por passos, diferenciando entre produtos de Hospedagem (com seleção de domínio), VPS (com configurações técnicas) e outros serviços.

## Componentes a Criar

### 1. Componentes de Passo (`src/components/checkout/`)
- `StepDomain.tsx`: Seleção de domínio para hospedagem (novo vs existente).
- `StepVPSConfig.tsx`: Configuração técnica de VPS (CPU, RAM, SSD, SO, Hostname, Localização).
- `StepAuth.tsx`: Cadastro ou login integrado ao fluxo.
- `StepSummary.tsx`: Resumo detalhado do pedido.
- `StepPayment.tsx`: Interface de pagamento.

### 2. Lógica Central
- Refatorar `src/routes/checkout.$productId.tsx` para gerenciar o estado dos passos e o tipo de produto.

## Detalhes Técnicos

### Fluxo de Hospedagem
- **Passo 1**: Domínio.
  - Opção "Registrar": Campo de busca (simulado ou real futuramente).
  - Opção "Existente": Campo para informar domínio.
- **Passo 2**: Configurações Adicionais (Ciclo de faturamento).
- **Passo 3**: Cadastro/Login (se não logado).
- **Passo 4**: Resumo e Pagamento.

### Fluxo de VPS
- **Passo 1**: Configurações Técnicas.
  - Seleção de SO (Ubuntu, Debian, Windows, etc).
  - Campo Hostname.
  - Seleção de Localização (Datacenters disponíveis).
- **Passo 2**: Cadastro/Login.
- **Passo 3**: Resumo e Pagamento.

### Fluxo Geral
- **Passo Final (Pós-Pagamento)**: Redirecionamento para página de sucesso com status de provisionamento.

## Alterações no Banco de Dados
- Nenhuma alteração de esquema necessária agora, usaremos os metadados do produto para decidir o fluxo.

## Verificação
- Testar cada tipo de produto na página inicial para garantir que abre o fluxo correto.
- Validar se o cadastro integrado funciona sem perder o contexto da compra.
