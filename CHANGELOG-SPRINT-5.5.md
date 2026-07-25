# Sprint 5.5 — Mercado Pago Enterprise

## Entregas

- Checkout individual `POST /api/soma/checkout` com `external_reference` no padrão `SOMA|MEMBER_ID|AAAA-MM`.
- Preferência Mercado Pago com URL de notificação, retorno para o app e chave de idempotência.
- Webhook assinado com resposta imediata e fila em memória com três tentativas.
- Associação por `external_reference`, usando e-mail apenas como fallback.
- Persistência de cartão, parcelas, autorização, transação, taxas, líquido e dados PIX.
- Abas: Pagamentos, FinanceiroMensal, WebhookLogs, HistoricoPagamentos, ContribuicoesMembros e AuditoriaFinanceira.
- Histórico de status e idempotência por pagamento/ação/data.
- Notificações automáticas para aprovado, recusado, pendente, em análise, estornado e contestado.
- Centro Financeiro e Minhas Contribuições no frontend.
- Relatório por período, método, ministério e célula.
- Exportação CSV e XLS compatível com Excel.
- Recibo PDF com hash e endpoint público de validação.
- Conciliação manual e rotina diária de pagamentos.
- Interfaces e adapters de persistência para Payment, Webhook, FinancialReport e Receipt.

## Endpoints

- `POST /api/soma/checkout`
- `POST /api/soma/webhooks/mercadopago`
- `GET /api/soma/financial/report`
- `GET /api/soma/financial/export/csv`
- `GET /api/soma/financial/export/xls`
- `GET /api/soma/receipts/:paymentId`
- `GET /api/soma/receipts/:paymentId/validate?hash=...`
- `POST /api/soma/reconciliation/run`

## Observação de infraestrutura

A fila desta sprint é local ao processo NestJS. Ela reduz o tempo de resposta do webhook, mas não sobrevive a reinicializações da API. Para múltiplas instâncias e garantia durável, a evolução recomendada é Redis/BullMQ.
