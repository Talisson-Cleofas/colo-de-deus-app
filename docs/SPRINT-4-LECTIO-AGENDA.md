# Sprint 4 — Lectio Divina, Agenda e Eventos

## Entregas

- Lectio diária em quatro passos: Lectio, Meditatio, Oratio e Contemplatio.
- Ação concreta do dia e marcação local de conclusão.
- Agenda mensal responsiva.
- Busca e filtro de eventos por categoria.
- Listagem de eventos e página completa de detalhes.
- Endpoints NestJS documentados no Swagger.
- Integração de leitura com as abas `Lectio` e `Eventos` do Google Sheets.
- Dados demonstrativos quando `DEMO_MODE=true`.

## Rotas web

- `/lectio`
- `/agenda`
- `/eventos`
- `/eventos/:id`

## Endpoints

- `GET /api/lectio`
- `GET /api/lectio/today`
- `GET /api/lectio/:id`
- `GET /api/events`
- `GET /api/events/categories`
- `GET /api/events/:id`
