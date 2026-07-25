# Sprint 3.9 — Lembretes e Mensagens de Aniversário

## Entregas

- Notificação automática no dia do aniversário.
- Lembrete antecipado para administradores e líderes.
- Antecedência configurável em Configurações Gerais.
- Mensagem padrão com as variáveis `{nome}` e `{dias}`.
- Envio manual de mensagem personalizada pela página Aniversários.
- Destinatários configuráveis: todos os membros ou somente líderes.
- Histórico integrado às abas `Notificações` e `NotificacoesEntregas`.
- Cartão de aniversários no dashboard administrativo e no painel dos membros.
- Resumo dos aniversários da semana e do mês.
- Processamento automático a cada hora e execução manual pela Central de Notificações.

## Endpoints

- `GET /api/birthdays/dashboard`
- `GET /api/birthdays/history`
- `POST /api/birthdays/:id/message`
- `POST /api/notifications/automations/process`

## Configurações salvas no Google Sheets

- `birthdayNotificationsEnabled`
- `birthdayReminderDays`
- `birthdayNotificationAudience`
- `birthdayDefaultMessage`
- `birthdayLeaderReminderMessage`

Não são necessárias novas abas. A sprint utiliza `Membros`, `Configurações`, `Notificações`, `NotificacoesLeituras`, `NotificacoesPreferencias` e `NotificacoesEntregas`.
