# Sprint 4.1.3.4 — State Machine Parser

## Entrega

- Novo `SemanticStateMachineParser` com leitura linha a linha.
- Seleção automática do bloco litúrgico completo quando a página contém um sumário antes das leituras.
- Uma linha só pode pertencer a um estado: Primeira Leitura, Salmo, Segunda Leitura, Aclamação ou Evangelho.
- Remoção de cabeçalhos repetidos, referências duplicadas e rodapés institucionais.
- Salmo separado em referência, refrão e estrofes, removendo repetições do refrão das estrofes.
- Evangelho iniciado no título “Proclamação do Evangelho” e encerrado em “Palavra da Salvação”.
- Compatibilidade preservada por meio da fachada `SemanticLectioParser`.
- Cenários automatizados para formatos semelhantes aos da CNBB e Canção Nova.

## Após atualizar

Execute uma sincronização forçada para ignorar o cache da versão anterior. Registros `MANUAL`, `REVISADA` ou protegidos continuam preservados.
