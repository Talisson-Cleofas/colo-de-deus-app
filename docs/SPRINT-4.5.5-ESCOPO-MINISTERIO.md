# Sprint 4.5.5 — Escopo por Ministério

## Implementação

- `MinistryScopeGuard` global executado após autenticação e RBAC.
- Resolução automática dos ministérios liderados pelo usuário por `lider_id`, `vice_lider_id` e vínculo legado pelo nome.
- Bloqueio de `ministryId` enviado por body ou query quando não pertence ao líder.
- Bloqueio de acesso direto por ID a eventos, células, cenáculos e membros de outro ministério.
- Filtro automático das listagens de membros, eventos, células e cenáculos.
- Compatibilidade com vínculos nas abas `Usuarios`, `Participantes`, `Membros` e `Ministérios`.

## Regra

`DEVELOPER`, `MISSION_LEADER` e o legado `ADMIN` mantêm visão global. `MINISTRY_LEADER` recebe somente os dados dos ministérios em que é líder ou vice-líder.
