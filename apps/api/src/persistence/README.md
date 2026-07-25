# Persistence Layer — Sprint 5.4

A camada de persistência separa os serviços de aplicação do mecanismo físico de armazenamento.

Fluxo atual:

`Service -> Repository Interface -> Google Sheets Adapter -> GoogleSheetsService -> Google Sheets`

A variável `DATABASE_PROVIDER` define o provider. Nesta sprint, `google-sheets` está implementado. Os valores `postgres` e `mongodb` já são reconhecidos pela configuração, mas falham de forma explícita até seus adapters serem adicionados.

## Cache

O cache, os índices por ID/e-mail e a deduplicação continuam encapsulados no `GoogleSheetsService`, acessado somente pelos adapters. Assim, application services não conhecem o cache.

## Paginação

Todos os adapters herdam `findAll(tab, { page, limit, orderBy, direction, filters }, specification)`.

## Unit of Work

`UNIT_OF_WORK` fornece uma transação lógica simples. Futuramente poderá delegar para Prisma Transaction ou TypeORM Transaction sem alterar os casos de uso.
