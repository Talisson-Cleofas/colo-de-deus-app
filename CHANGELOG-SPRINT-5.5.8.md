# Sprint 5.5.8 — Perfis RBAC Dinâmicos no Cadastro de Membros

## Objetivo

Corrigir o campo **Perfil de acesso** da Área de Membros para refletir os perfis ativos configurados na aba `Perfis` do Google Sheets e nas regras do RBAC.

## Entregas

### Frontend

- Removeu a lista fixa antiga de perfis do formulário de membros.
- Carrega os perfis atribuíveis em `GET /api/profiles/assignable`.
- Exibe nome amigável, ordem por nível e somente perfis ativos.
- O perfil `DEVELOPER` é visível e atribuível somente por outro desenvolvedor.
- Líder da Missão pode atribuir o próprio nível e os níveis inferiores.
- Mantém compatibilidade visual com registros antigos que ainda utilizem `ADMIN`.
- O filtro de perfis e os chips da tabela usam os nomes reais configurados no RBAC.
- Inclui fallback seguro caso o endpoint de perfis esteja temporariamente indisponível.

### Backend

- Novo endpoint `GET /api/profiles/assignable`.
- Validação de escalonamento de privilégio no backend.
- Cadastro e atualização de membros só aceitam perfis ativos que o usuário atual pode atribuir.
- DTOs passaram a aceitar códigos de perfis configurados dinamicamente, com validação centralizada pelo `ProfilesService`.
- `MISSION_LEADER` passa a administrar membros sem depender do código legado `ADMIN`.

## Segurança

A validação não depende apenas do frontend. O backend bloqueia a atribuição de um perfil acima do nível do usuário autenticado e impede que Líderes da Missão criem usuários `DEVELOPER`.

## Versão

- Monorepo: `5.5.8`
- API: `5.5.8`
- Web: `5.5.8`
