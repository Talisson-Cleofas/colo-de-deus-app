# Validação e build

```bash
npm install
npm run typecheck
npm run build
```

Ou execute:

```bash
npm run validate
```

Saídas esperadas:

- `apps/api/dist`
- `apps/web/dist`

O GitHub Actions repete `npm ci`, `npm run typecheck` e `npm run build` em pushes e pull requests para `main`.
