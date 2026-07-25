# Sprint 4.2.0 — Base Google Maps e Google Drive

Esta versão prepara backend e frontend para Google Maps e Google Drive sem exigir credenciais. As integrações iniciam desativadas e retornam mensagens claras.

## Endpoints Maps
- `GET /api/maps/status`
- `POST /api/maps/geocode`
- `POST /api/maps/reverse-geocode`
- `GET /api/maps/members`
- `GET /api/maps/cells`
- `GET /api/maps/cenacles`
- `GET /api/maps/events`

## Endpoints Drive
- `GET /api/drive/status`
- `GET /api/drive/status/test`
- `POST /api/drive/upload`
- `GET /api/drive/files`
- `GET /api/drive/files/:id`
- `DELETE /api/drive/files/:id`
- uploads especializados para membros, células, cenáculos, eventos, Soma+ e Lectio.

## Segurança
Tipos iniciais: JPEG, PNG, WEBP e PDF. Executáveis são bloqueados e cada categoria possui limite próprio. Credenciais permanecem exclusivamente no backend.

## Próxima etapa
A Sprint 4.2.1 adicionará os modelos de `.env`, validação e ativação real das credenciais.
