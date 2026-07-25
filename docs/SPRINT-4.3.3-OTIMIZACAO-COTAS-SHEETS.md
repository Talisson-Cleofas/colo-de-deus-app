# Sprint 4.3.3 — Otimização de cotas do Google Sheets

A sincronização estrutural foi reescrita para evitar excesso de requisições.

## Fluxo otimizado

1. Uma chamada `spreadsheets.get` lê os metadados.
2. Uma chamada `values.batchGet` lê todos os cabeçalhos existentes.
3. Uma chamada `spreadsheets.batchUpdate` cria todas as abas ausentes.
4. Uma chamada `values.batchUpdate` grava todos os cabeçalhos necessários.
5. O resultado fica em cache por 60 segundos.

Também foram adicionados bloqueio de sincronizações concorrentes e retry com exponential backoff para erros 429/5xx.

## Configurações

```env
GOOGLE_SHEETS_STRUCTURE_CACHE_SECONDS=60
GOOGLE_SHEETS_RETRY_ATTEMPTS=6
```
