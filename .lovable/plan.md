# Plano de Correção do Script do Agente de Monitoramento

O erro `{"error":"Unexpected token ',', ...\"\", \"cpu\": , \"ram\": ,\"... is not valid JSON"}` indica que as variáveis `$CPU_USAGE`, `$RAM_USAGE` ou `$DISK_USAGE` estão vazias no momento da execução do `curl`, resultando em um JSON inválido como `{"cpu": , "ram": ...}`. Isso acontece porque a lógica de fallback `${VAR:-0}` no shell não está funcionando como esperado ou os comandos de extração (`top`, `free`, `df`) estão retornando formatos que o `sed`/`awk` não conseguem processar na máquina do usuário.

## Alterações

### 1. Backend: Refatoração do Script de Instalação
- Modificar `src/routes/api/public/scripts/install-agent.ts` para usar métodos mais robustos de coleta de métricas.
- Garantir que a limpeza de strings seja feita de forma agressiva (remover qualquer caractere não numérico exceto o ponto decimal).
- Forçar o valor `0` se a variável resultante estiver vazia após a limpeza.
- Ajustar o comando `curl` para enviar as variáveis entre aspas no JSON, permitindo que o servidor trate strings vazias se necessário (embora o objetivo seja enviar números).

### 2. Backend: Ajuste no Endpoint de Métricas
- Revisar `src/routes/api/public/vps-metrics.ts` (opcional, se necessário para lidar com dados ligeiramente malformados).

## Detalhes Técnicos
- Usar `grep -oE '[0-9.]+'` para extrair apenas números.
- Adicionar logs no script para depuração no terminal do usuário.
- Mudar a forma como o `EOF` é tratado para evitar problemas de escape com `$`.

## Verificação
- O usuário deverá rodar o comando `curl ... | bash` novamente.
- O sucesso será confirmado quando o terminal exibir `{"success":true}` em vez do erro de JSON.
