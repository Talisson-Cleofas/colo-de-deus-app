# Sprint 5.5.1 — Correção React Query e TypeScript

## Correções

- Inclusão confirmada de `@tanstack/react-query` nas dependências do frontend.
- Remoção do `package-lock.json` desatualizado da Sprint 5.5 para que `npm install` gere um lockfile compatível com as dependências atuais.
- Tipagem explícita das métricas em `PerformancePage`.
- Tipagem dos callbacks `retry` e `retryDelay` em `PermissionContext`.
- Versão atualizada para 5.5.1.

## Instalação

Após substituir a versão anterior, execute na raiz:

```bash
rm -rf node_modules apps/web/node_modules apps/api/node_modules
npm install
npm run typecheck
```

No PowerShell, use `Remove-Item -Recurse -Force node_modules, apps/web/node_modules, apps/api/node_modules` quando as pastas existirem.
