# Sprint 4.5.7 — Exclusão Segura

Implementa exclusão lógica e restauração para Eventos, Cenáculos, Células e Membros.

## Auditoria

As quatro abas passam a possuir: `ativo`, `deleted_at`, `deleted_by`, `created_at`, `created_by`, `updated_at` e `updated_by`.

A exclusão não apaga a linha. Ela define `ativo=FALSE`, registra autor/data e remove o item das listagens normais. A restauração limpa os campos de exclusão e reativa o registro.

## Rotas

- `DELETE /api/events/:id`
- `POST /api/events/:id/restore`
- `GET /api/events/trash`
- `DELETE /api/communities/:id`
- `POST /api/communities/:id/restore`
- `GET /api/communities/trash?type=CELL|CENACLE`
- `DELETE /api/members/:id`
- `POST /api/members/:id/restore`
- `GET /api/members/trash`
