# Plano: Análise de Substituição do WHMCS

O sistema atual foi desenvolvido para ser uma alternativa moderna e focada ao WHMCS, priorizando automação de VPS e experiência do usuário (UX). Abaixo está a análise técnica da cobertura atual.

## Análise de Cobertura

O sistema atinge aproximadamente **75% a 80%** de substituição das funcionalidades do WHMCS.

### O que já está 100% operacional:
- **Gestão de Clientes**: Cadastro completo, perfis e autenticação segura via Supabase.
- **Ciclo Financeiro**: Pedidos, faturas e controle de inadimplência.
- **Gateways Brasileiros**: Pix (CajuPay), Boleto (PagHiper) e Cartão, com fallback automático.
- **Automação VPS**: Integração profunda com Contabo, provisionamento automático e métricas reais via agente.
- **Hospedagem Web**: Provisionamento automático via DirectAdmin.
- **Suporte**: Sistema de tickets robusto.
- **Migração**: Ferramenta de importação de CSV do WHMCS já funcional.

### O que falta para os 100%:
- **Revenda de Domínios**: Integração com APIs como eNom ou ResellerClub.
- **Afiliados**: Sistema de recompensas e rastreio de indicações.
- **Base de Conhecimento**: Central de ajuda com artigos.
- **Marketing**: Automação de e-mails promocionais.

## Detalhes Técnicos
- O banco de dados Supabase já possui as 33 tabelas essenciais para operar o negócio.
- A arquitetura TanStack Start garante uma performance superior ao backend em PHP do WHMCS.
- O monitoramento via agente customizado (`eqsam-agent.sh`) oferece dados que o WHMCS nativamente não fornece.

## Próximos Passos Sugeridos
1. **Integração de Domínios**: Adicionar suporte a um registrador.
2. **Módulo de KB**: Criar a interface para artigos de ajuda.
3. **Afiliados**: Implementar a lógica de comissões.
