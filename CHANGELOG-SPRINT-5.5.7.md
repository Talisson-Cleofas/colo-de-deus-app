# Sprint 5.5.7 — Google Maps & Geolocation Stabilization

- Endpoint `GET /api/members/map` com resposta padronizada, deduplicação por ID, filtro de inativos/excluídos e ordenação por nome.
- Coordenadas vazias, inválidas e `0,0` são tratadas como `null`.
- Novo `MapsSyncService` para geocodificação, cache de 24 horas, persistência no Google Sheets e geração de rotas.
- Geocodificação automática no cadastro e alteração de endereço do membro.
- Endpoints `POST /api/google-maps/rebuild` e `GET /api/google-maps/status`.
- Colunas: `formatted_address`, `maps_last_update`, `geocode_status` e `geocode_provider`.
- Mapa real com Google Maps JavaScript API, agrupamento leve de marcadores, pesquisa, filtros e localização do usuário.
- Lista simplificada sem duplicações, links válidos e fallback “Endereço não cadastrado”.
- Cache offline no frontend e atualização automática quando a conexão retorna.
