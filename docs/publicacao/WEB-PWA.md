# Publicação Web e PWA

## Netlify
- Base directory: `apps/web`
- Build command: `npm run build`
- Publish directory: `apps/web/dist`
- Variáveis: copie de `apps/web/.env.example`.
- Crie um redirect SPA: `/* /index.html 200`.

## Instalação PWA
Após publicar por HTTPS, abra no Chrome/Edge/Safari e use **Instalar aplicativo** ou **Adicionar à Tela de Início**.

## Offline
O service worker usa:
- cache de shell e arquivos estáticos;
- network-first para páginas;
- cache de respostas GET da API;
- fila local para POST/PUT/PATCH/DELETE preparados pelo helper `offlineQueue.ts`.

Sempre aumente `VERSION` em `apps/web/public/sw.js` ao alterar recursos críticos.
