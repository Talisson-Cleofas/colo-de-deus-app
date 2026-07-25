# Sprint 3.8 — Módulo de Aniversários

## Entregas

- Novo item **Aniversários** no menu principal.
- Seleção automática do mês atual.
- Listagem ordenada por dia e nome.
- Blocos de aniversariantes do dia e próximos aniversários.
- Foto, dia, mês e idade opcional.
- Busca por nome.
- Filtros por ministério, célula e cenáculo.
- Abertura do perfil interno do membro.
- Destaque visual dos aniversariantes do dia.
- Leitura da data de nascimento diretamente da aba `Membros`.
- Respeito às configurações `birthdaysEnabled` e `showBirthdayAge` da aba `Configurações`.

## Endpoint

`GET /api/birthdays`

Parâmetros opcionais: `month`, `search`, `ministryId`, `cellId` e `cenacleId`.

## Google Sheets

Não é necessário criar uma nova aba. O módulo utiliza `Membros`, `Participantes`, `Ministérios`, `Células`, `Cenáculos` e `Configurações`.
