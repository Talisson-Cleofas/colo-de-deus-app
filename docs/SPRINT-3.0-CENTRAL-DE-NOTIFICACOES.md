# Sprint 3.0 — Central de Notificações

## Entregas
- Listagem profissional com busca, filtros, paginação e histórico.
- Envio individual e coletivo para todos, ministério, célula, cenáculo ou perfil.
- Sino com contador de notificações não lidas.
- Marcação individual e coletiva como lida.
- Link interno para o conteúdo relacionado.
- Exclusão lógica na aba `Notificações`.
- Leituras individuais na aba `NotificacoesLeituras`.
- Permissões no backend por ADMIN, Líder de Ministério, Líder de Célula e Membro.

## Endpoints
- `GET /api/notifications`
- `GET /api/notifications/options`
- `POST /api/notifications`
- `PATCH /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `DELETE /api/notifications/:id`
