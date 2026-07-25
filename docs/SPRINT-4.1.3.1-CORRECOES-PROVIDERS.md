# Sprint 4.1.3.1 — Correções dos providers da Lectio

## Principais correções

- criação do `LectioProviderManager` como ponto único de ordenação, timeout, cache, fallback e tratamento de exceções;
- falhas do provider principal não interrompem mais a tentativa da fonte alternativa;
- cada tentativa é registrada separadamente em `HistoricoIntegracoes` com operação `TENTATIVA_PROVIDER`;
- registro de prioridade, duração, uso do cache, resultado e mensagem de erro;
- parsers CNBB e Canção Nova revisados com duas estratégias:
  1. preservação e leitura dos limites de títulos/seções do HTML;
  2. fallback por expressões regulares e marcadores litúrgicos;
- validação mínima antes da persistência: Primeira Leitura ou Evangelho devem possuir conteúdo consistente;
- referências bíblicas também são extraídas diretamente dos títulos das seções;
- conteúdo anterior é preservado quando todas as fontes falham.

## Fluxo

1. O manager lê a prioridade configurada em `Integracoes`.
2. Executa a fonte principal.
3. Em erro, registra a tentativa e segue para o fallback.
4. Em sucesso, atualiza `Lectio` e registra a fonte realmente utilizada.
5. Se todas falharem, não sobrescreve nem remove o conteúdo já salvo.

## Histórico esperado

`HistoricoIntegracoes` recebe uma linha para cada tentativa e outra linha com o resultado final da sincronização.

## Google Sheets

Não há mudança de cabeçalhos. Permanecem:

- `Lectio`
- `Integracoes`
- `HistoricoIntegracoes`
- `ConfiguracoesSistema`
