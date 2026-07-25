# Sprint 4.5.13 — Sincronização Lectio resiliente

## Correções

- O parser deixa de interpretar o menu de navegação da Canção Nova como conteúdo litúrgico.
- A Primeira Leitura real é priorizada quando seguida pela fórmula "Leitura do/da...".
- Validação de blocos passou a informar o tamanho encontrado para primeira leitura, salmo e evangelho.
- A URL da Canção Nova envia `sAno`, `sMes` e `sDia`, além do parâmetro legado `data`.
- Requisições utilizam cabeçalhos compatíveis com navegador e `cache-control: no-cache`.
- A CNBB nacional permanece como fonte principal.
- Quando a página nacional entrega somente o shell do WordPress, o backend consulta automaticamente o espelho oficial do Regional Sul 3 da CNBB.
- Nova variável opcional: `LECTIO_CNBB_MIRROR_URL`.

## Arquivos principais

- `apps/api/src/lectio/semantic-state-machine.parser.ts`
- `apps/api/src/lectio/cnbb-lectio.provider.ts`
- `apps/api/src/lectio/cancao-nova-lectio.provider.ts`
- `apps/api/.env.example`
