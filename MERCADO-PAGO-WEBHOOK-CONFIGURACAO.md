# Mercado Pago no Soma+ — Sprint 7.2.1

O Soma+ não usa mais o link estático `mpago.la` para novas assinaturas. Cada membro cria uma assinatura própria pela API `POST /preapproval`, com valor mensal, e-mail e `external_reference` individual. Isso permite relacionar a assinatura e cada cobrança ao cadastro correto.

## Variáveis da API no Render

```env
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
MERCADO_PAGO_WEBHOOK_SECRET=...
MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS=false
MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS=900
MERCADO_PAGO_WEBHOOK_MAX_ATTEMPTS=5
MERCADO_PAGO_API_TIMEOUT_MS=10000
MERCADO_PAGO_ENVIRONMENT=production
PUBLIC_API_URL=https://colo-de-deus-api-5yel.onrender.com
FRONTEND_URL=https://seu-app.netlify.app
```

Nunca coloque os valores reais no Git, em screenshots públicas ou dentro do ZIP.

## URL de produção

```text
https://colo-de-deus-api-5yel.onrender.com/api/soma/webhooks/mercadopago
```

Na mesma aplicação Mercado Pago que gerou o `MERCADO_PAGO_ACCESS_TOKEN`, configure os eventos:

- **Pagamentos** — tópico `payment`;
- **Planos e assinaturas** — tópico `subscription_preapproval`;
- **Planos e assinaturas** — tópico `subscription_authorized_payment`.

O backend também aceita `subscription_preapproval_plan`, mas o ignora porque esta versão cria assinaturas personalizadas sem plano associado. A assinatura secreta copiada da configuração deve ser exatamente a usada em `MERCADO_PAGO_WEBHOOK_SECRET`.

## Abas Google Sheets

Depois de publicar a nova API, execute uma vez, com usuário autorizado:

```http
POST /api/admin/sheets/initialize
```

Confirme pelo endpoint `GET /api/admin/sheets/schema` as abas:

- `AssinaturasSoma`;
- `CobrancasAssinaturas`;
- `WebhookJobs`;
- `WebhookLogs`;
- `Pagamentos`;
- `HistoricoPagamentos`;
- `ContribuicoesMembros`;
- `FinanceiroMensal`.

O inicializador adiciona abas e colunas ausentes; faça backup da planilha antes de executá-lo em produção.

## Teste obrigatório em staging

1. Publique API e frontend com as credenciais de teste da mesma aplicação Mercado Pago.
2. Entre como membro com e-mail válido na aba `Membros`.
3. Abra **Soma+ > Contribuições e PIX > Assinar mensalmente**.
4. Escolha um valor e conclua a autorização no checkout do Mercado Pago.
5. Confirme que `AssinaturasSoma` mudou de `pending` para `authorized`.
6. Confirme o evento recorrente em `CobrancasAssinaturas` e o pagamento em `Pagamentos`.
7. Verifique a notificação individual no app e o lançamento nos relatórios.
8. Reenvie o mesmo evento e confirme que `WebhookJobs` o reconhece como duplicado sem criar novo pagamento ou histórico.
9. Simule valor divergente e confirme que o job permanece em `RETRY` sem registrar a cobrança.
10. Teste o cancelamento no app e confirme o estado `cancelled` no Mercado Pago e na planilha.

## Recuperação e operação

- `WebhookJobs=RETRY`: falha temporária; o processador tenta novamente.
- `WebhookJobs=DEAD`: atingiu o limite; investigue credencial, disponibilidade e resposta oficial antes de reprocessar.
- A reconciliação diária consulta pagamentos e atualiza assinaturas abertas, reduzindo o risco de perda caso uma notificação atrase.
- O app também oferece **Atualizar status** após o retorno do checkout.
- Para rollback, reverta API e frontend juntos. Não apague `WebhookJobs`, `AssinaturasSoma` ou `CobrancasAssinaturas`.

## Dependência externa

O código está pronto para receber e processar os três tópicos, mas a ativação no painel Mercado Pago e a troca das variáveis no Render exigem acesso autorizado às contas. Não ative produção antes de concluir o teste em staging.
