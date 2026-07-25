# Sprint 5.3.4 — Compatibilidade Material UI 7 + Build Estável

## Correções

- Atualização da página de Performance para a API do `Grid` do Material UI 7.
- Remoção da propriedade obsoleta `item` e das propriedades antigas `xs`, `sm` e `md`.
- Uso da propriedade `size={{ xs, sm, md }}` suportada pelo MUI 7.
- Tipagem explícita dos cartões e das métricas de rotas, sem introdução de `any`.
- Revisão global do frontend para usos de `Grid`, `Grid2` e APIs antigas relacionadas.
- Melhoria da responsividade da lista de tempos das rotas.
- Versões do monorepo, API e frontend atualizadas para `5.3.4`.

## Validação

- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- teste de inicialização de desenvolvimento
