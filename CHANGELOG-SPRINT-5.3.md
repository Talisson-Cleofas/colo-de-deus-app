# Sprint 5.3 — Performance & Escalabilidade

- Cache inteligente de dados e estrutura do Google Sheets com TTL, deduplicação de requisições simultâneas e invalidação após escrita.
- TanStack Query configurado globalmente.
- Rotas carregadas com React.lazy e Suspense.
- Dashboard agregado em `GET /api/dashboard`, carregando seções paralelamente.
- Base para virtualização com react-window.
- PWA com cache offline versionado e estratégia stale-while-revalidate para imagens.
- Compressão HTTP Gzip/Brotli quando suportado pela infraestrutura.
- Componente de imagem otimizada com lazy loading e async decoding.
- Métricas Server-Timing, X-Response-Time e endpoint `/api/performance/metrics`.
- Métricas de carregamento e chamadas API no frontend.

## Variáveis
`GOOGLE_SHEETS_DATA_CACHE_SECONDS=45`
`GOOGLE_SHEETS_STRUCTURE_CACHE_SECONDS=300`
