# Sprint 4.5.18 — Eventos somente leitura para membros

## Regras aplicadas

- Membros continuam vendo o menu Eventos.
- Membros visualizam somente eventos publicados.
- A única ação disponível para membros é **Ver detalhes**.
- Membros não podem criar, editar, publicar, despublicar, excluir ou restaurar eventos.
- A aba administrativa de presenças e justificativas não é exibida para membros.
- O frontend não consulta endpoints administrativos de eventos quando o perfil é MEMBER.
- O backend bloqueia todas as operações de alteração mesmo por chamada manual à API.
