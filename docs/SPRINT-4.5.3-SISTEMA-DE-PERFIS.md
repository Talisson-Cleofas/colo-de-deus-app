# Sprint 4.5.3 — Sistema de Perfis

## Perfis padrão
- DEVELOPER — Desenvolvedor
- MISSION_LEADER — Líder Missão
- MINISTRY_LEADER — Líder Ministério
- CELL_LEADER — Líder Célula
- MEMBER — Membro

O código legado `ADMIN` continua aceito na autenticação e é normalizado para `MISSION_LEADER`.

## API
- `GET /api/profiles`
- `POST /api/profiles`
- `PATCH /api/profiles/:id`
- `PATCH /api/profiles/:id/status`
- `DELETE /api/profiles/:id`
- `POST /api/profiles/seed/default`

Criação, edição, ativação, desativação e exclusão exigem perfil Desenvolvedor. A exclusão é bloqueada quando o perfil está atribuído a membros ativos.

## Frontend
Tela em `/configuracoes/perfis`, com criação, edição, ativação, desativação, exclusão segura e restauração dos perfis padrão.
