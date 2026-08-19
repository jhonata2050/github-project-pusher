# Plano de Migração para Evolution Go API

O usuário informou que o sistema está configurado para a "Evolution API" padrão, mas deve usar a "Evolution Go" (instância centralizada). Com base no Swagger fornecido (`https://evogo.srvbr.top/swagger/index.html`), a estrutura de envio de mensagens é diferente (instância enviada no corpo da requisição e URL fixa).

## Alterações Técnicas

### 1. Backend (`src/lib/whatsapp.server.ts`)
- **Simplificar `sendWhatsAppMessage`**: Remover a tentativa multi-endpoint (fallback) e focar no padrão da Evolution Go conforme documentação.
- **Payload**: Ajustar o corpo da requisição para incluir o campo `instance` no primeiro nível do JSON.
- **URL**: Utilizar a URL centralizada `/message/sendText` sem o nome da instância no path.
- **Headers**: Manter o `apikey` no cabeçalho conforme exigido.

### 2. Frontend (`src/routes/_authenticated/admin/whatsapp.tsx`)
- **Dicas de URL**: Atualizar os placeholders e textos informativos para refletir que a URL deve ser a base da Evolution Go (ex: `https://evogo.srvbr.top`).

## Detalhes da Implementação

### Estrutura do Payload (Evolution Go)
```json
{
  "number": "5511999999999",
  "text": "Mensagem aqui",
  "instance": "nome-da-instancia",
  "delay": 0,
  "linkPreview": true
}
```

### Endpoint
`POST {URL_BASE}/message/sendText`

## Passos

1. Modificar `src/lib/whatsapp.server.ts` para implementar o formato exato da Evolution Go.
2. Ajustar o tratamento de erro para reportar falhas específicas da Go (como instância inválida ou token expirado).
3. Testar a conexão através da interface administrativa para validar a nova lógica.
