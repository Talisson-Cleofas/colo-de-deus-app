# Sprint 5.5 — Arquitetura

Fluxo: membro → checkout NestJS → preferência Mercado Pago → pagamento → webhook assinado → fila → consulta oficial do pagamento → repositories → Google Sheets → notificação → atualização da interface.

A fonte de verdade é a consulta `GET /v1/payments/:id`, nunca apenas o corpo do webhook.

O vínculo primário é `external_reference=SOMA|MEMBER_ID|AAAA-MM`. O e-mail é somente fallback.

O recibo contém hash SHA-256 e pode ser validado pelo endpoint público. O PDF desta sprint é gerado sem dependências externas.

A conciliação diária consulta os pagamentos criados nas últimas 24 horas e reaplica o processamento idempotente.
