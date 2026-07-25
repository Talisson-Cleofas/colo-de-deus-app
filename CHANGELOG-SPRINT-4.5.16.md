# Sprint 4.5.16 — Correção de permissões de membros

## Regras aplicadas

- Membros comuns podem visualizar a listagem de todos os membros ativos.
- Membros comuns podem editar somente o próprio cadastro.
- Membros comuns não podem excluir nem restaurar membros, eventos, células ou cenáculos.
- A aba Soma+ não mostra nem consulta as contribuições recentes para o perfil MEMBER.
- O perfil MEMBER recebe MEMBERS:UPDATE com escopo OWN no seed padrão.

## Proteção em camadas

As restrições foram aplicadas no frontend e no backend. Alterar a URL ou chamar os endpoints manualmente não concede acesso de exclusão.
