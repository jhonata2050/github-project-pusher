# Plano de Correção e Melhoria do Importador WHMCS

O objetivo é garantir que a importação de Clientes, Serviços e Faturas do WHMCS funcione corretamente, resolvendo os problemas de associação entre tabelas e permitindo o acesso completo ao dossiê do cliente.

## Alterações Propostas

### Backend (Banco de Dados e Segurança)
- **Verificação das Colunas `whmcs_id`**: Confirmar se as colunas `whmcs_id` existem nas tabelas `profiles`, `services` e `invoices` e se possuem índices para performance e unicidade.
- **Permissões RLS**: Garantir que os administradores tenham acesso total a todas as tabelas, mesmo após a importação.

### Lógica de Importação (`src/lib/whmcs-import.server.ts`)
- **Normalização de IDs**: Converter IDs do WHMCS para string de forma consistente em todas as buscas e inserções.
- **Log de Depuração Aumentado**: Adicionar logs específicos durante a fase de associação (linking) para identificar exatamente por que um serviço ou fatura não encontra seu cliente.
- **Tratamento de Lotes**: Refinar o processamento de lotes para evitar falhas silenciosas e reportar melhor o progresso.
- **Fallbacks de Associação**: Se o `whmcs_id` falhar, tentar e-mail; se o e-mail falhar em serviços/faturas, tentar buscar o cliente pelo `userid` original do WHMCS se ele já tiver sido importado com esse ID.

### Interface Administrativa (`src/routes/_authenticated/admin/import.tsx`)
- **Feedback Visual**: Exibir a mensagem "foi gerado X erros, verifique o historico" conforme solicitado pelo usuário no banner principal.
- **Melhoria no Dossiê**: Garantir que o link para o dossiê use o ID correto e que a página de detalhes suporte clientes importados.

## Detalhes Técnicos
- As tabelas do WHMCS (`tblclients`, `tblhosting`, `tblinvoices`) são frequentemente exportadas com cabeçalhos variados. O mapeamento flexível (`pick`) será expandido com mais sinônimos.
- O erro de "Seroval" indica estouro de string na serialização entre cliente e servidor; o chunking já implementado será mantido e otimizado.

## Próximos Passos
1. Validar as tabelas no banco de dados.
2. Aplicar correções na lógica de associação do servidor.
3. Atualizar a interface com o banner de erro solicitado.
