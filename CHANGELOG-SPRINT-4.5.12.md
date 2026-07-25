# Sprint 4.5.12 — Correção da Sincronização Lectio Divina

## Problema corrigido

A sincronização falhava quando CNBB ou Canção Nova entregavam títulos, referências e conteúdo litúrgico no mesmo bloco HTML. Isso causava mensagens como:

- `Marcador de Primeira Leitura não encontrado.`
- `Primeira Leitura, Salmo e Evangelho devem existir em blocos separados.`

## Implementação

- Normalização semântica de títulos litúrgicos mesmo quando chegam na mesma linha.
- Compatibilidade com `Primeira Leitura`, `1ª Leitura`, `Segunda Leitura`, `2ª Leitura`, `Salmo`, `Salmo Responsorial`, `Responsório`, `Aclamação` e `Evangelho`.
- Referências aceitas entre parênteses ou diretamente após o título.
- Proteção para não interpretar `Proclamação do Evangelho` como início de um novo bloco.
- Separação da fórmula introdutória e do texto quando ambos chegam no mesmo nó HTML.
- Fallback quando a página omite o título da primeira leitura, mas contém `Leitura do...`, `Leitura da...`, `Leitura da Carta...` ou `Leitura da Profecia...`.
- Validação do Salmo considerando o refrão quando a fonte não fornece estrofes separadas.
- Teste de regressão para o formato compacto usado atualmente pelos provedores.

## Arquivo principal alterado

`apps/api/src/lectio/semantic-state-machine.parser.ts`
