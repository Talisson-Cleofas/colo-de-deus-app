# Sprint 4.5.4 — Sistema de Permissões

## Entregas

- CRUD de permissões na aba `Permissoes`.
- Criação, edição, ativação, desativação e exclusão.
- Vínculos por perfil na aba `PerfisPermissoes`.
- Matriz visual totalmente editável por perfil.
- Escopos: próprio, célula, ministério, missão e todos.
- Seeds idempotentes para permissões e vínculos padrão.
- Compatibilidade com códigos legados `RESOURCE:ACTION` e apresentação amigável `resource.action`.

## Endpoints

- `GET /api/permissions`
- `POST /api/permissions`
- `PATCH /api/permissions/:id`
- `PATCH /api/permissions/:id/status`
- `DELETE /api/permissions/:id`
- `POST /api/permissions/seed/default`
- `GET /api/permissions/matrix/all`
- `PUT /api/permissions/matrix`
- `PUT /api/permissions/matrix/bulk`

Somente `DEVELOPER` altera permissões e matriz. Líder da missão pode consultar.
