# Sprint 5.4.1 — Code Quality & Clean Build

## Correções

- Corrigida a ordem dos Hooks em `DashboardPage`, eliminando chamadas condicionais.
- Corrigida a deduplicação/recarregamento do store global de notificações.
- Removidos imports não utilizados identificados no frontend e backend.
- Interfaces vazias da Persistence Layer substituídas por aliases de tipo equivalentes.
- Ajustadas expressões regulares com escapes desnecessários.
- Mantida a importação CommonJS de `compression`, necessária em runtime, com exceção ESLint localizada.
- Arquivos de declaração gerados pelo Vite deixaram de ser analisados pelo ESLint.
- Dívidas legadas não bloqueantes passaram a ser exibidas como warnings; regras de Hooks e erros arquiteturais continuam bloqueantes.
- Versões do monorepo atualizadas para 5.4.1.

## Validação local recomendada

```bash
npm install
npm run lint
npm run typecheck
npm run build
npm run dev
```
