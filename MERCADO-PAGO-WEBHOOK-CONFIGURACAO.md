# Configuração Mercado Pago — Sprint 5.5

## Variáveis da API

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
MERCADO_PAGO_WEBHOOK_SECRET=...
MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS=false
MERCADO_PAGO_ENVIRONMENT=production
PUBLIC_API_URL=https://sua-api.onrender.com
FRONTEND_URL=https://seu-app.netlify.app
```

## URL do webhook

```text
https://sua-api.onrender.com/api/soma/webhooks/mercadopago
```

Selecione o tópico **Pagamentos**. Também é recomendado habilitar contestações/chargebacks quando disponível na aplicação Mercado Pago.

## Abas Google Sheets

Crie ou sincronize as abas usando `google-sheets-modelos/SPRINT-5.5-ABAS.csv`.

## Teste

1. Publique a API com HTTPS.
2. Cadastre o webhook no Mercado Pago.
3. Entre no app e abra Soma+ > Minhas Contribuições.
4. Clique em Nova contribuição.
5. Informe valor e competência.
6. Conclua um pagamento de teste.
7. Verifique Pagamentos, WebhookLogs, HistoricoPagamentos e Notificações.
