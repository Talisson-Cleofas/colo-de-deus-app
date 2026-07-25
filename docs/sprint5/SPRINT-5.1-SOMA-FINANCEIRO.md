# Sprint 5.1 — Soma+ Financeiro Integrado

## Google Sheets
Crie/sincronize a aba `Financeiro` com as colunas:
`id`, `pix_key`, `pix_bank`, `pix_agency`, `pix_account`, `pix_cnpj`, `subscription_url`, `pix_qrcode_drive`, `updated_at`.

O registro principal usa `id=principal`. Se a aba estiver vazia, o sistema usa os valores padrão entregues nesta sprint.

## Mercado Pago
O botão de assinatura abre `https://mpago.la/1J1bojR` em uma nova aba. Os dados do cartão não passam pelo aplicativo.

A área "Minha assinatura" está preparada para receber status real posteriormente via webhook/API do Mercado Pago. Nesta sprint, sem credenciais/webhook, ela exibe "Não vinculada" e direciona o gerenciamento ao Mercado Pago.
