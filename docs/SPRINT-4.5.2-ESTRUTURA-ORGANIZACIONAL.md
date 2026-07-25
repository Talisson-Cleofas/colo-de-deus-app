# Sprint 4.5.2 — Estrutura Organizacional

## Entregas

- Nova entidade e aba `Missao` no Google Sheets.
- Campo `missao_id` nas abas `Usuarios`, `Ministérios`, `Eventos`, `Células` e `Cenáculos`.
- Campo `ministerio_id` mantido/adicionado nos registros organizacionais aplicáveis.
- API REST `/api/missions` para listar, criar e editar missões.
- Seed automático da **Missão Brasília**.
- Seed automático dos ministérios: Música, Missões, Eventos, Finanças, Células, Cenáculo, Comunicação e Intercessão.
- Tela **Missões** no menu lateral.
- Tela **Ministérios** atualizada com vínculo obrigatório à missão.

## Seed

Ao iniciar a API em modo real, o serviço verifica a estrutura e cria somente os registros ausentes. O processo é idempotente e não duplica missões ou ministérios.

Também é possível executar manualmente pelo botão **Aplicar seed** na tela Missões ou pelo endpoint:

`POST /api/missions/seed/default`

## Google Sheets

A sincronização de estrutura cria a aba `Missao` e acrescenta as novas colunas sem apagar dados existentes.
