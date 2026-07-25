# Sprint 2.3.2 — Perfis, eventos e acompanhamento

## Perfis

- `ADMIN`: acesso total.
- `MINISTRY_LEADER`: Líder de Ministério. Pode criar células, cenáculos e eventos; consultar confirmações, presenças e justificativas; administrar o próprio ministério.
- `CELL_LEADER`: Líder de Célula. Pode editar e registrar presença somente na própria célula, além das permissões de membro.
- `MEMBER`: acesso padrão, confirmação de presença em eventos e envio de justificativa.

Valores antigos `LEADER` e `LIDER` são lidos como `CELL_LEADER` para compatibilidade.

## Google Sheets

A aba `Membros` passa a utilizar também a coluna R (`formador`).

Criar a aba `ConfirmacoesEventos` com cabeçalhos:

`id | evento_id | evento | membro_id | membro | email | ministerio | status | justificativa | destinatarios | criado_em | situacao`

As justificativas são direcionadas aos usuários `MINISTRY_LEADER` do ministério do membro. Quando o membro não possui ministério, ou nenhum líder é encontrado, o direcionamento é feito aos administradores.
