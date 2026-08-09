# Sprint 7.2.1 — Soma+ recorrente e webhooks

## Corrigido

- O botão de assinatura deixa de depender do link estático do Mercado Pago.
- Cada assinatura é criada pela API com valor escolhido, e-mail validado e referência individual do membro.
- A tela exibe estados reais: pendente, ativa, pausada e cancelada.
- O membro pode retomar a autorização, atualizar o status e cancelar a assinatura.
- O webhook passa a processar `subscription_preapproval`, `subscription_authorized_payment` e `payment`.
- Cobranças recorrentes validam valor e moeda antes da persistência.
- Eventos duplicados não repetem pagamento, histórico nem notificação.
- Pagamentos sem referência Soma+ são ignorados para não importar transações alheias ao módulo.
- A reconciliação diária atualiza pagamentos e assinaturas abertas.
- Chamadas ao Mercado Pago possuem timeout e erros sem payload sensível nos logs.

## Dados

- Nova aba `AssinaturasSoma`.
- Nova aba `CobrancasAssinaturas`.
- `FinanceiroMensal` recebe contadores de assinaturas verificadas e atualizadas.

## Compatibilidade

- `SOMA_SUBSCRIPTION_URL` permanece aceito apenas como configuração legada; novas assinaturas não o utilizam.
- A estrutura atual de pagamentos, relatórios e recibos foi preservada.
