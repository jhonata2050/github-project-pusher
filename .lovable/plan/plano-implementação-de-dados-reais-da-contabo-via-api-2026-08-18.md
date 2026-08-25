# Plano: Implementação de Dados Reais da Contabo via API

O objetivo é substituir dados simulados por informações reais obtidas diretamente da API da Contabo para instâncias VPS, focando em métricas de uso (CPU, RAM, Disco) e informações detalhadas da instância.

## Alterações Propostas

### Backend (`src/lib/contabo.server.ts`)
- Refatorar `getContaboInstanceStats`:
  - Implementar chamada ao endpoint de monitoramento da Contabo: `GET /v1/compute/instances/{instanceId}/monitoring`.
  - Adicionar suporte a outros endpoints de métricas se disponíveis na API v1.
  - Implementar um "fallback inteligente" que, se as métricas de monitoramento não estiverem habilitadas na conta Contabo do usuário, retorne `null` ou um flag indicando indisponibilidade, em vez de dados aleatórios.
- Melhorar `getContaboInstanceDetails`:
  - Garantir que todos os campos úteis (IPs adicionais, status detalhado, data de criação) sejam retornados.

### Funções de Servidor (`src/lib/vps.functions.ts`)
- Atualizar `getVPSDetails`:
  - Garantir que erros da API Contabo sejam propagados de forma que o frontend possa exibir um estado de "Métricas indisponíveis" em vez de dados falsos.

### Frontend (`src/routes/_authenticated/vps/$vpsId.tsx`)
- Ajustar os cards de métricas (CPU, RAM, HD):
  - Exibir estados de carregamento ou "Indisponível" se a API real não retornar dados.
  - Remover qualquer lógica que dependa de `Math.random()`.
  - Exibir a data da última atualização real fornecida pela API.
- Adicionar um botão de "Sincronizar" manual para forçar a atualização dos dados da API.

### Scripts de Diagnóstico
- Criar um script temporário para validar a resposta da API Contabo com as credenciais atuais do usuário e entender exatamente qual o formato das métricas retornadas.

## Detalhes Técnicos
- **Endpoint de Monitoramento**: `https://api.contabo.com/v1/compute/instances/{instanceId}/monitoring`
- **Autenticação**: Mantida via `getContaboToken` (OAuth2).
- **Tratamento de Erros**: Diferenciar entre erro de rede/API e erro de "Métricas não habilitadas".

## Verificação
- Executar o script de diagnóstico para confirmar a recepção de dados reais.
- Abrir a página de detalhes da VPS e validar que os valores não mudam aleatoriamente a cada refresh (o que indicaria `Math.random()`).
