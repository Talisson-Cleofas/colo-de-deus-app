# Sprint 4.1.2 — Provider CNBB

## Entrega

- `CnbbLectioProvider` com consulta HTTP à página oficial configurada em `LECTIO_CNBB_URL`.
- Conversão do HTML em texto, normalização e separação das seções litúrgicas.
- Extração de celebração, tempo e cor litúrgica, leituras, salmo, Evangelho e antífonas.
- Detecção de alterações antes de gravar.
- Preservação de conteúdo `MANUAL`, `REVISADA` ou protegido.
- Atualização da aba `Lectio` e registro técnico em `HistoricoIntegracoes`.
- Botão **Sincronizar CNBB**, progresso, resultado e última sincronização no frontend.

## Configuração

```env
LECTIO_CNBB_URL=https://www.cnbb.org.br/liturgia-diaria/
LECTIO_PROVIDER_TIMEOUT_MS=20000
```

Na aba `Integracoes`, mantenha `LECTIO_CNBB_ENABLED` como `true` para o módulo `Lectio`.

## Endpoint

`POST /api/lectio/sync/cnbb`

Opcionalmente, informe uma data ISO: `POST /api/lectio/sync/cnbb?date=2026-07-21`.

## Observação operacional

O provider lê a página pública da CNBB. Caso a estrutura textual do site seja alterada, o sistema registra o erro em `HistoricoIntegracoes` em vez de sobrescrever conteúdo existente.
