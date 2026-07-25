# Colo de Deus — Sprint 6

Monorepo da Missão Brasília com React 19, NestJS 11, Google Sheets, Google Drive, Firebase, PWA e Flutter para Android/iPhone.

## Entregas desta sprint
- PWA instalável.
- Navegação e telas visitadas disponíveis offline.
- Fila local de operações para sincronizar quando a internet retornar.
- Aplicativo Flutter compartilhado para Android e iOS.
- Dashboard mobile, membros, Lectio, agenda e atalhos dos módulos anteriores.
- Guias de publicação web, backend, Google Play e App Store.
- GitHub Actions para Node e Flutter.

## Web e API
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm install
npm run dev
```
- Web: http://localhost:5173
- API: http://localhost:4000/api
- Swagger: http://localhost:4000/docs

## Flutter
Instale o Flutter e execute:
```bash
cd mobile
flutter pub get
flutter create . --platforms=android,ios
flutter run --dart-define=DEMO_MODE=true --dart-define=API_URL=http://10.0.2.2:4000/api
```
O comando `flutter create .` completa arquivos nativos dependentes da versão local do Flutter sem substituir a implementação em `lib/`.

## PWA
Para testar o service worker, gere e sirva o build:
```bash
npm run build --workspace=@colo/web
npm run preview --workspace=@colo/web
```
Service workers só funcionam em produção/preview por HTTPS ou localhost.

## Publicação
Consulte `docs/publicacao/`:
- `WEB-PWA.md`
- `BACKEND-RENDER.md`
- `ANDROID-GOOGLE-PLAY.md`
- `IOS-APP-STORE.md`

## Portas
- API: 4000
- Web: 5173

## Sprint 6.1 — UI Profissional

- Dashboard reconstruído em componentes menores e legíveis.
- Sidebar compacta com botão Sair de 44 px, sem sobreposição.
- Logo branca aplicada na navegação.
- Tema preto, branco e bronze alinhado ao mockup aprovado.
- Cards de acesso rápido, hero da Lectio e lista de eventos responsivos.

## Sprint 6.2 — Navegação unificada

- `/membros`: diretório e mapa de membros em abas.
- `/perfil`: perfil e configurações em abas.
- `/notificacoes`: central de notificações.
- `/celulas?tab=mapa`: mapa incorporado ao módulo Células.
- `/soma?tab=relatorios`: relatórios financeiros.
- `/soma?tab=drive`: arquivos do Google Drive.

## Sprint 6.4

Na tela inicial, o quinto atalho agora é **Cenáculos**. O mapa deixou de aparecer como módulo independente no dashboard e permanece dentro de **Células > Mapa das células**.


## Sprint 6.4.2 — Ministérios

A navegação **Ministérios** foi restaurada na sidebar e está disponível em `/ministerios`.
