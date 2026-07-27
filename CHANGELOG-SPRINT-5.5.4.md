# Sprint 5.5.4 — Lectio sincronizada no Dashboard

## Correções

- Dashboard prioriza a Lectio do dia em `America/Sao_Paulo`.
- Quando a leitura do dia não está disponível, o Dashboard utiliza a última Lectio publicada.
- A resposta informa `isToday` para o frontend diferenciar conteúdo atual e conteúdo mais recente.
- O card inicial mostra `De hoje` ou `Última publicada • DD/MM/AAAA`.
- A página Lectio também prioriza explicitamente o registro da data atual.
- Estado vazio atualizado para indicar ausência total de conteúdo, não apenas ausência da leitura do dia.
