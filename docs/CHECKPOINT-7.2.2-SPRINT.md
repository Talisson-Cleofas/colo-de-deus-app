# Checkpoint local — sprint de segurança e Agenda Missionária

- Data: 2026-08-25
- Branch: `recovery/7.2.2-consolidation`
- Versão: `7.2.2`
- Commit-base oficial: `04960f65ffc7e28761e1e1fec2d1c54f59fbb1ca`
- Escopo: correção da audiência `CENACULO`, matriz RBAC/BOLA, dependências e conclusão da Agenda Missionária.
- Operação: exclusivamente local; nenhum push, PR, deploy, migration ou alteração remota foi executado.

## Validação pré-commit

| Verificação | Resultado |
| --- | --- |
| `git diff --check` | Aprovado; somente avisos locais LF/CRLF |
| Secrets e arquivos `.env` rastreados | Nenhum encontrado |
| Lint | Aprovado, 0 erros e 16 avisos preexistentes |
| Typecheck | Aprovado |
| Build API | Aprovado |
| Build frontend | Aprovado |
| Testes backend | 40/40 aprovados |
| Playwright | Aprovado: autorização, conclusão, bloqueio e idempotência de UI |
| Axe no diálogo de conclusão | 0 violações |
| `npm audit --omit=dev` | 0 críticas, 0 altas, 6 moderadas |

## Segurança

As seis ocorrências moderadas restantes pertencem à cadeia transitiva de `firebase-admin` / Google Cloud (`@google-cloud/storage`, `gaxios`, `retry-request`, `teeny-request` e `uuid`). O remédio indicado pelo audit exige downgrade semântico incompatível de `firebase-admin` para `10.3.0`; por isso o risco é aceito temporariamente, sem atualização forçada.

## Agenda Missionária

Foi consolidada a transição `ENVIADA_AOS_MEMBROS -> CONCLUIDA`, com autorização por objeto, idempotência local, histórico append-only, auditoria explícita, notificações individuais e ação acessível no frontend.

## Limites do checkpoint

O módulo legado `apps/api/src/missionaries` e `Missionarios.csv` não foram restaurados nem importados. O checkout antigo não foi modificado.
