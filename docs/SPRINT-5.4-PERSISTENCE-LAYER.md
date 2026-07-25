# Sprint 5.4 — Persistence Layer

## Arquitetura entregue

```text
Controller
  -> Application Service
    -> Repository Interface (token NestJS)
      -> provider selecionado por DATABASE_PROVIDER
        -> Google Sheets Adapter
          -> GoogleSheetsService (cache, índices, deduplicação)
            -> Google Sheets API
```

## Repositórios

- `IMemberRepository`
- `IEventRepository`
- `ICellRepository`
- `IMinistryRepository`
- `ILectioRepository`
- `INotificationRepository`
- `ISomaRepository`
- `IAuditRepository`

## Migração futura

Para PostgreSQL ou MongoDB:

1. implementar adapters que satisfaçam as interfaces existentes;
2. registrar os adapters em `PersistenceModule`;
3. alterar `DATABASE_PROVIDER`;
4. manter controllers, DTOs, rotas e telas React sem alteração.

## Compatibilidade

Os adapters Google Sheets delegam ao serviço atual. Isso mantém o comportamento consolidado, inclusive cache, stale cache, índices em memória, retry e deduplicação.
