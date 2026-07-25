# Sprint 4.3 — Integração Completa Maps + Drive

## Entregas

- Geocodificação automática na criação e edição de Eventos, Células e Cenáculos.
- Atualização automática de latitude, longitude, Google Place ID e data da geocodificação quando o endereço muda.
- Cache persistente na aba `GeocodingCache`, com TTL configurável para reduzir chamadas à API.
- Busca de endereços pelo Google Places em `GET /api/maps/places?q=`.
- Criação e reutilização automática de pastas por registro, persistidas em `PastasDrive`.
- Uploads especializados vinculam o arquivo ao registro de origem e atualizam as colunas do Google Sheets.
- Metadados persistidos em `Arquivos` e auditoria em `HistoricoArquivos`.
- Mapas de Membros, Células, Cenáculos e Eventos leem latitude e longitude reais das planilhas.

## Variáveis

```env
GOOGLE_MAPS_ENABLED=true
GOOGLE_MAPS_SERVER_API_KEY=
GOOGLE_MAPS_CACHE_TTL_DAYS=180
GOOGLE_DRIVE_ENABLED=true
GOOGLE_DRIVE_ROOT_FOLDER_ID=
```

A conta de serviço precisa ter acesso de Editor à planilha e à pasta raiz do Google Drive.
