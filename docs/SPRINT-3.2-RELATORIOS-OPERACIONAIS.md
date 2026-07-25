# Sprint 3.2 — Relatórios Operacionais

## Entregas

- painel geral com indicadores de membros e frequência;
- membros ativos e inativos;
- agrupamento por perfil, ministério, célula e cenáculo;
- presenças, faltas e justificativas;
- filtros por período, membro e estrutura;
- busca e paginação;
- escopo de dados validado no backend.

## Permissões

- ADMIN consulta todos os dados;
- MINISTRY_LEADER consulta somente seus ministérios e estruturas vinculadas;
- CELL_LEADER consulta somente suas células;
- responsável ou vice-responsável de cenáculo consulta somente seus cenáculos quando possuir perfil de liderança compatível.

## Endpoints

- `GET /api/reports/options`
- `GET /api/reports/operational`

A sprint não exige novas abas no Google Sheets. Os relatórios são calculados a partir de Membros, Ministérios, Células, Cenáculos, Participantes e Presenças.
