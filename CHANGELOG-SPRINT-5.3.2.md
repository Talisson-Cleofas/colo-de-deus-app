# Sprint 5.3.2 — Correção de inicialização da API

## Correção

- Ajustada a importação do pacote `compression` para o formato CommonJS compatível com a configuração atual do NestJS/TypeScript.
- Corrigido o erro em tempo de execução: `TypeError: compression_1.default is not a function`.
- Mantida a compressão HTTP com `threshold: 1024` e `level: 6`.

## Arquivo alterado

- `apps/api/src/main.ts`

## Validação recomendada

```bash
npm install
npm run typecheck
npm run build
npm run dev
```
