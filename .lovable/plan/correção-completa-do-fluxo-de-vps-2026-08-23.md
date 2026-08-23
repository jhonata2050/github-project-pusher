# Correção completa do fluxo de VPS

## Objetivo
Fazer o fluxo funcionar de ponta a ponta: plano VPS → checkout → pagamento → provisionamento ou vínculo manual → sincronização → exibição segura no painel e no dossiê do cliente.

## Problemas confirmados
- A tela de planos envia o identificador do plano externo, mas o backend grava em `whmcs_id`; `products.external_id` fica vazio.
- O checkout coleta hostname, sistema e região, mas não envia nem persiste esses dados no pedido/serviço.
- O provisionamento identifica VPS por campos inexistentes/heurística no nome, em vez de `product_type = 'vps'`.
- A função de provisionamento externo está vazia; hoje o pagamento apenas deixa uma observação aguardando o administrador.
- “Sincronizar” apenas consulta a API externa e não atualiza/cria registros locais.
- A ação administrativa de energia usa uma função que exige que o administrador seja dono do serviço.
- A listagem principal do cliente depende de joins diretos no navegador; o fluxo será centralizado em consultas autenticadas consistentes.

## Implementação
1. **Modelo e configuração**
   - Persistir no serviço a configuração solicitada no checkout (hostname, sistema e região).
   - Garantir unicidade de uma instância por serviço e manter o identificador externo único.

2. **Planos e checkout**
   - Corrigir criação/edição para gravar `products.external_id`.
   - Validar que planos automáticos tenham identificador externo.
   - Enviar a configuração VPS ao criar o pedido e armazená-la no serviço.

3. **Provisionamento após pagamento**
   - Detectar VPS exclusivamente por `product_type = 'vps'`.
   - Implementar a criação real da instância usando o plano externo e a configuração do cliente.
   - Criar/atualizar `vps_instances`, ativar o serviço somente quando houver confirmação válida e registrar auditoria detalhada.
   - Manter provisionamento manual como fallback explícito quando o plano não possuir identificador externo.

4. **Sincronização e vínculo administrativo**
   - Fazer a sincronização persistir status, IP, região, sistema e especificações das instâncias já conhecidas.
   - Corrigir o vínculo manual para salvar todos os dados disponíveis, impedir vínculos duplicados e ativar o serviço de forma consistente.
   - Autorizar ações administrativas após validação de função, sem exigir propriedade do serviço.

5. **Painel e dossiê do cliente**
   - Centralizar a consulta de serviços do cliente em função autenticada, retornando produto e instância vinculada sem depender de joins frágeis no navegador.
   - Exibir o plano VPS contratado mesmo enquanto aguarda provisionamento; liberar “Monitorar” quando a instância estiver vinculada.
   - Manter a página exclusiva de VPS e o dossiê usando a mesma identificação canônica.

6. **Validação**
   - Conferir migração, build, erros de runtime e os fluxos administrativo e do cliente.
   - Validar com os dados existentes: plano `VPS ONE`, serviço ativo e sua instância vinculada.

## Detalhes técnicos
- Funções autenticadas usarão o contexto do usuário para autorização; acesso privilegiado ocorrerá somente depois da verificação de admin/staff.
- Nenhuma credencial ou nome do provedor será exposto na interface do cliente.
- Falhas externas manterão o serviço pendente, com motivo técnico em auditoria, sem criar uma falsa instância ativa.
