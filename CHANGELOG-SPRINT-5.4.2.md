# Sprint 5.4.2 — Contrato Estável do Dashboard

## Correção principal

A API do dashboard do membro agora garante que as seções `lectio`, `notifications`, `birthdays` e `events` sejam sempre retornadas, mesmo quando uma integração, aba do Google Sheets ou serviço auxiliar falhar.

## Alterações

- Contrato de resposta estável em `GET /api/dashboard` e `GET /api/dashboard/member`.
- Fallback obrigatório para notificações: `{ unreadCount: 0, recent: [] }`.
- Normalização de respostas inesperadas do serviço de notificações.
- Fallbacks independentes para Lectio, aniversários e eventos.
- Logs de aviso por seção sem derrubar a tela inicial.
- Tipagem específica `DashboardNotificationsData`.
- Versão atualizada para `5.4.2`.

## Resultado esperado

O frontend deixa de receber `notifications: undefined` e pode renderizar a tela inicial mesmo quando uma seção parcial estiver indisponível.
