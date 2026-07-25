# Sprint 2.8 — Gestão de Cenáculos

## Entregas
- Cadastro de cenáculos por ADMIN e Líder de Ministério.
- Responsável e vice-responsável vinculados a membros ativos.
- Vínculo opcional com ministério e célula.
- Inclusão e remoção de participantes pela interface.
- Endereço completo, latitude e longitude.
- Data inicial, horário e recorrência: não recorrente, semanal, quinzenal ou mensal.
- Registro de presença e justificativa na aba `Presenças` usando `tipo=CENACULO`.
- Edição e gestão de participantes pelo ADMIN, liderança do ministério, responsável ou vice-responsável do cenáculo.
- Proteções de autorização aplicadas no backend, além da interface.

## Abas utilizadas
- `Cenáculos`
- `Membros`
- `Ministérios`
- `Células`
- `Participantes`
- `Presenças`

## Valores gravados
- Participantes: `tipo=CENACULO`
- Presenças: `tipo=CENACULO`
- Recorrência: `NAO`, `SEMANAL`, `QUINZENAL` ou `MENSAL`

## Validação
- TypeScript web aprovado.
- TypeScript API aprovado.
- Build Vite aprovado.
- Build NestJS aprovado.
