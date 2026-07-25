# Sprint 4.1.3.6 — Estabilização das Notificações

## Entregas

- `NotificationDateNormalizer` no backend, tolerante a ISO, datas brasileiras, hífens e números seriais do Google Sheets.
- Datas inválidas retornam `null` e geram aviso, sem interromper o endpoint.
- Ordenação segura: notificações sem data permanecem visíveis e são posicionadas ao final.
- `date-utils.ts` compartilhado no frontend com `parseDateSafe`, `formatDateSafe`, `dateInputValueSafe` e `timestampSafe`.
- Central de Notificações deixa de formatar datas sem validação.
- Filtro por data funciona também com valores normalizados ou ausentes.

## Resultado esperado

A rota `/notificacoes` abre pelo sino e pelo menu lateral mesmo quando registros antigos contêm datas vazias, brasileiras, seriais ou inválidas.
