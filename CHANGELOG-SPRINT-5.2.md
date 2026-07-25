# Sprint 5.2 - QR Code compacto e Webhook Mercado Pago

## Interface Soma+

- Substituído o cartaz completo pelo QR Code Pix isolado enviado pelo usuário.
- Box do QR Code reduzido para no máximo 210 px.
- Box dos dados bancários para TED compactado.
- Botões menores e layout responsivo para celular e desktop.
- Adicionada seção "Meus pagamentos confirmados" para o usuário autenticado.

## Webhook Mercado Pago

Endpoint público:

`POST /api/soma/webhooks/mercadopago`

O endpoint:

- valida `x-signature` e `x-request-id`;
- consulta o pagamento na API oficial com o Access Token;
- evita duplicidade usando o ID do pagamento;
- associa o pagamento ao membro pelo e-mail do pagador;
- grava os dados na aba `PagamentosMercadoPago`;
- registra outros tópicos na aba `WebhooksMercadoPago`;
- disponibiliza relatórios individuais e administrativos.

## Endpoints de relatório

- `GET /api/soma/payments/my`
- `GET /api/soma/payments/report?month=YYYY-MM`

## Variáveis de ambiente

- `MERCADO_PAGO_ACCESS_TOKEN`
- `MERCADO_PAGO_WEBHOOK_SECRET`
- `MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS=false`
