# Sprint 5.4 — Persistence Layer

## Entregas

- Novo módulo global `PersistenceModule`.
- Interfaces para membros, eventos, células, ministérios, Lectio, notificações, Soma+ e auditoria.
- Adapters Google Sheets por domínio.
- `RepositoryFactory` controlada por `DATABASE_PROVIDER`.
- Cache e índices existentes encapsulados atrás dos repositories.
- Paginação, ordenação e filtros preparados em `findAll`.
- Specification Pattern com filtros reutilizáveis.
- `UnitOfWork` lógico, preparado para transações futuras.
- Services principais desacoplados de `GoogleSheetsService`.
- Estrutura inicial de Clean Architecture criada sem mover contratos HTTP existentes.

## Configuração

```env
DATABASE_PROVIDER=google-sheets
```

`postgres` e `mongodb` estão reservados e exigirão adapters próprios em sprint futura.
