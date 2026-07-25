# Sprint 2.3 — Área Administrativa

## Entregas

- Dashboard exclusivo para usuários com perfil `ADMIN`.
- Boas-vindas personalizadas com nome do administrador.
- Indicadores em tempo real de membros, ministérios, células, cenáculos, eventos do mês, presenças e Soma+.
- Bloco com as últimas notificações.
- Endpoint protegido `GET /api/admin/dashboard`.
- Leitura resiliente do Google Sheets, sem derrubar todo o painel quando uma aba ainda não estiver configurada.
- Estado de carregamento, atualização manual e tratamento visual de erros.
- Cards clicáveis para navegação aos módulos relacionados.
- Dashboard comum preservado para perfis `LEADER` e `MEMBER`.

## Intervalos opcionais no `.env` da API

```env
GOOGLE_SHEETS_MINISTRIES_RANGE=Ministérios!A:Z
GOOGLE_SHEETS_COMMUNITIES_RANGE=Comunidades!A:Z
GOOGLE_SHEETS_EVENTS_RANGE=Eventos!A:P
GOOGLE_SHEETS_ATTENDANCE_RANGE=Presenças!A:Z
GOOGLE_SHEETS_SOMA_RANGE=Soma!A:K
GOOGLE_SHEETS_NOTIFICATIONS_RANGE=Notificações!A:H
```

Os valores acima já são usados como padrão quando as variáveis não estiverem presentes.
