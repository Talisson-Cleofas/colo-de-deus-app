# Sprint 4.1.3 — Canção Nova + Fallback

## Fluxo

1. O backend lê `LECTIO_PRIMARY_SOURCE` e `LECTIO_FALLBACK_SOURCE` na aba `Integracoes`.
2. Consulta a fonte principal.
3. Em erro, timeout ou conteúdo inválido, consulta a fonte alternativa.
4. Se ambas falharem, não remove nem sobrescreve o conteúdo já salvo.
5. Toda tentativa é registrada em `HistoricoIntegracoes` com fonte utilizada, quantidade de tentativas e erros.

## Endpoints

- `POST /api/lectio/sync` — sincronização automática com fallback.
- `GET /api/lectio/providers/status` — situação e prioridade dos providers.
- `POST /api/lectio/sync/cnbb` — mantido para compatibilidade e diagnóstico.

## Cache

`LECTIO_PROVIDER_CACHE_TTL_MS=900000` mantém o resultado de cada fonte por 15 minutos. Use `POST /api/lectio/sync?force=true` para ignorar o cache.

## Google Sheets

Nenhuma nova aba ou coluna é necessária. Continuam sendo usadas `Lectio`, `Integracoes`, `HistoricoIntegracoes` e `ConfiguracoesSistema`.
