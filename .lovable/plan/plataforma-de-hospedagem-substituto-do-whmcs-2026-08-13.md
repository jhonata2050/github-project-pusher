# Plataforma de hospedagem (substituto do WHMCS)

Sistema completo de gestão de hospedagem web: clientes, planos, faturas, provisionamento automático no DirectAdmin, tickets, promoções e e-mails — com visual copiado de perto do AbacatePay (verde-limão, cards claros, sidebar com grupos recolhíveis, banner de ambiente de teste).

Como o escopo é grande, vou entregar em fases. Cada fase deixa o sistema utilizável.

## Identidade visual (aplicada desde a Fase 1)

- Verde-limão como cor primária, fundo quase-branco, cards brancos com borda suave e raio grande.
- Login centralizado em card: título grande com nome do produto em verde, botão "Entrar com o Google", divisor "ou entre com e-mail", campo de e-mail, botão principal escuro, aviso de termos.
- Área logada: sidebar clara com Painel / Sua Loja (Produtos, Cupons, Clientes, Cobranças, Link de pagamentos) / Integração, rodapé com toggle "Modo de desenvolvedor", Suporte e conta do usuário.
- Faixa laranja no topo quando o ambiente estiver em modo sandbox, com botão "Ir para produção".
- Breadcrumbs, filtros de período em pills (Hoje, Esse mês, Últimos 30 dias, ...), cards de KPI e tabela de métodos de pagamento como nas referências.

## Fase 1 — Base, contas e catálogo

- Ativar o backend (Lovable Cloud) para banco, autenticação, arquivos e código de servidor.
- Login/cadastro por e-mail e senha + Entrar com o Google; papéis separados (`admin`, `staff`, `client`) em tabela própria.
- Perfis de cliente: nome, empresa, CPF/CNPJ, telefone, endereço.
- Catálogo: grupos de produtos, produtos/planos de hospedagem com ciclos de cobrança (mensal, trimestral, semestral, anual) e preços por ciclo.
- Painel admin com layout AbacatePay e painel do cliente com as mesmas bases visuais.

## Fase 2 — Financeiro

- Pedidos, serviços contratados (com data de vencimento e status: pendente, ativo, suspenso, cancelado), faturas com itens, impostos e descontos.
- Geração automática de faturas antes do vencimento e cálculo de atraso/multa (job agendado).
- Promoções: cupons de valor fixo ou percentual, primeiro ciclo ou recorrente, limites de uso e validade.
- Painel financeiro: total em vendas, número de transações, faturamento por método de pagamento, receita recorrente, inadimplência.
- Baixa manual de pagamento pelo admin.

## Fase 3 — Pagamentos (multi-gateway)

Camada única de gateways para plugar vários provedores com a mesma interface (criar cobrança, consultar, receber webhook, reembolsar).

- Ordem de implementação: AbacatePay (Pix/cartão/boleto) → Stripe → Woovi → PagHiper → CajuPay → MisticPay.
- Cada gateway tem chaves próprias guardadas com segurança e alternância entre sandbox e produção.
- Página de checkout de fatura com escolha do método, QR Code Pix e link de pagamento compartilhável.
- Webhooks com verificação de assinatura para confirmar pagamento e ativar/renovar o serviço automaticamente.

Observação: Woovi, PagHiper, CajuPay e MisticPay exigem conta e credenciais suas; vou pedir as chaves quando chegarmos em cada um.

## Fase 4 — Integração DirectAdmin

- Cadastro de servidores DirectAdmin (host, porta, usuário, chave de login, revenda, SSL).
- Provisionamento automático ao pagar: criar conta, escolher pacote, domínio, usuário e senha.
- Suspender ao vencer, reativar ao pagar, cancelar/terminar, upgrade/downgrade de pacote.
- Painel do cliente: uso de disco/banda, contas de e-mail, bancos de dados, login direto no painel (single sign-on), troca de senha.
- Fila de tarefas com retentativa e log de cada ação para auditoria.

## Fase 5 — Tickets e e-mails

- Tickets com departamentos, prioridade, status, anexos, respostas do cliente e notas internas do staff.
- Vínculo de ticket a serviço ou fatura; atribuição para atendentes.
- E-mails transacionais: boas-vindas, dados da conta de hospedagem, fatura emitida, aviso de vencimento, pagamento confirmado, suspensão, resposta de ticket, redefinição de senha.
- Modelos de e-mail editáveis pelo admin com variáveis, mais log de envios.

## Detalhes técnicos

- TanStack Start com rotas de arquivo; área logada sob layout protegido `_authenticated` e rotas admin com verificação de papel via função `has_role` no banco.
- Banco Postgres com RLS em todas as tabelas: cliente só vê os próprios dados; admin/staff via `has_role`.
- Toda lógica sensível (gateways, DirectAdmin, e-mails) em server functions; nenhuma credencial no navegador.
- Webhooks e jobs agendados em rotas `/api/public/*` com verificação de assinatura ou token.
- Chamadas ao DirectAdmin pela API JSON com Basic Auth usando chave de login (nunca a senha do root), tudo por HTTPS.
- Validação de entrada com Zod no cliente e no servidor.
- Agendamento de tarefas recorrentes (faturas, suspensões, avisos) via cron no banco chamando o endpoint protegido.

## Primeiro passo se aprovado

Fase 1 completa: backend ativo, autenticação com Google e e-mail, papéis, perfis, catálogo de planos e os dois painéis já com o visual do AbacatePay.
