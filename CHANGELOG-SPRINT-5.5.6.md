# Sprint 5.5.6 — Operação Ministerial, PWA, Mapa e Lectio Automática

## Entregas

- Remoção funcional de membros dos ministérios, incluindo vice-líder e líder por administradores.
- Ao remover uma liderança, o campo correspondente em `Ministérios` é limpo e o vínculo em `Participantes` é desativado.
- Reconciliação da estrutura após a remoção para evitar vínculos órfãos.
- PWA com atualização automática do Service Worker, limpeza de caches antigos e navegação network-first com timeout.
- Área de Membros com endereço, bairro e CEP no cadastro.
- Mapa de membros conectado a `GET /api/maps/members`.
- Geocodificação automática e cache das coordenadas para membros com endereço completo.
- Lectio sincronizada na inicialização da API quando a leitura do dia estiver ausente.
- Nova tentativa automática configurável após falha de sincronização.
- Página da Lectio atualizada ao mudar o dia, voltar ao app ou recuperar o foco.

## Variáveis recomendadas

```env
GOOGLE_MAPS_ENABLED=true
GOOGLE_MAPS_SERVER_API_KEY=...
VITE_GOOGLE_MAPS_ENABLED=true
VITE_GOOGLE_MAPS_API_KEY=...
LECTIO_AUTO_SYNC_ENABLED=true
LECTIO_AUTO_SYNC_TIMEZONE=America/Sao_Paulo
LECTIO_AUTO_SYNC_HOUR=0
LECTIO_AUTO_SYNC_MINUTE=10
LECTIO_AUTO_SYNC_RETRY_MINUTES=30
```
