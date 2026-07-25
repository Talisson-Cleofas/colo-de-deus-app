# Sprint 5.5.3 — Estabilização do Dashboard em Produção

## Correções

- Corrigido o crash `Cannot read properties of undefined (reading 'data')` na tela inicial.
- Adicionada proteção completa para `notifications`, `birthdays`, `lectio` e `events`.
- Normalização defensiva da resposta de `/api/dashboard` no React Query.
- Valores padrão seguros quando uma seção da API estiver ausente ou indisponível.
- Atualização da versão do Service Worker para invalidar caches antigos da PWA.
- Versão dos pacotes atualizada para 5.5.3.

## Ajustes adicionais de implantação

- API passa a priorizar a variável `PORT` fornecida pelo Render.
- Removida a regra `*.json` do `.gitignore`, que impedia o envio de `package.json`, `tsconfig.json` e outros arquivos essenciais ao GitHub.
