# Runbook de produção — Sprint 7.2.1

## Maturidade

Esta entrega é adequada para staging e piloto controlado. O armazenamento financeiro permanece no Google Sheets; por isso, backup, inicialização das abas e um ciclo real de assinatura devem ser homologados antes da liberação geral.

## Publicação

1. Faça backup integral da planilha.
2. Publique primeiro em staging com aplicação e credenciais Mercado Pago de teste.
3. Execute `POST /api/admin/sheets/initialize` e valide `GET /api/admin/sheets/schema`.
4. Publique a API e, depois, o frontend da mesma revisão.
5. Configure os tópicos e a URL conforme `MERCADO-PAGO-WEBHOOK-CONFIGURACAO.md`.
6. Execute o fluxo completo de assinatura, cobrança, repetição do evento e cancelamento.
7. Somente então promova a mesma revisão para produção.

## Verificações locais

```bash
npm ci
npm run check:env:examples
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:production
```

## Variáveis novas ou obrigatórias

```env
MERCADO_PAGO_ACCESS_TOKEN=
MERCADO_PAGO_WEBHOOK_SECRET=
MERCADO_PAGO_ALLOW_UNSIGNED_WEBHOOKS=false
MERCADO_PAGO_WEBHOOK_TOLERANCE_SECONDS=900
MERCADO_PAGO_WEBHOOK_MAX_ATTEMPTS=5
MERCADO_PAGO_API_TIMEOUT_MS=10000
PUBLIC_API_URL=https://colo-de-deus-api-5yel.onrender.com
FRONTEND_URL=https://seu-app.netlify.app
```

## Smoke tests

- `GET /api/health` retorna `status=ok` e versão `7.2.1`.
- Um membro não cria assinatura para outro cadastro.
- Clique duplo não cria duas assinaturas pendentes.
- O retorno do checkout atualiza o status pela API oficial.
- Webhook assinado retorna HTTP 202 e termina como `PROCESSED`.
- Repetição do mesmo evento não duplica efeitos.
- Valor ou moeda divergente deixa o job em `RETRY` e não registra cobrança.
- Pagamento sem `external_reference` Soma+ não aparece nos relatórios.
- Cancelamento interrompe novas cobranças e atualiza `AssinaturasSoma`.

## Observabilidade

- Alerta de disponibilidade e latência em `/api/health`.
- Alerta para 5xx, 429, reinícios e aumento de `WebhookJobs=DEAD`.
- Revisão diária de `WebhookJobs`, `WebhookLogs` e quotas do Google Sheets/Mercado Pago.
- Owner operacional: administrador financeiro/técnico responsável pelas credenciais do Render e Mercado Pago.

## Rollback

Reverta API e frontend para a Sprint 7.2 em conjunto. As novas abas são aditivas e podem permanecer. Não apague jobs ou registros financeiros. Se houver corrupção de estrutura, restaure a cópia da planilha feita antes da inicialização.

## Pendências externas

- Ativar URL e tópicos no painel Mercado Pago.
- Inserir `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` no Render.
- Validar uma assinatura com comprador diferente da conta vendedora.
- Migrar fila e dados financeiros para banco transacional antes de escala ampla.
