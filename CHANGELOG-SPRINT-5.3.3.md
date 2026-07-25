# Sprint 5.3.3 — Estabilização, Cache Real e Correção de Performance

- Cache em memória com TTL, stale fallback, métricas, tags e deduplicação de Promises.
- Índices em memória para membros por e-mail/ID e registros por aba/ID.
- RBAC por perfil armazenado em cache por 5 minutos.
- React Query centralizado para `/rbac/me`, com retry 1s/2s/4s e sem transformar timeout em 403.
- Tela “Validando permissões...” e recuperação explícita em falha.
- Timeout de API aumentado para 30 segundos e mensagens diferentes para offline, timeout e indisponibilidade.
- Normalizador/validador de Notificações corrige em memória `APP` deslocado para `data_envio`.
- Endpoint agregado `GET /api/dashboard`.
- Monitor em `Admin > Performance` com cache, memória e tempos médios das rotas.
- Compressão aplicada apenas a respostas maiores que 2 KB.
