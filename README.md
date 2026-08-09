# Colo de Deus — Sprint 7.2.1

Monorepo da Missão Brasília com React 19, NestJS 11, Google Sheets, Firebase, PWA e um protótipo Flutter. A Sprint 7.2.1 mantém a estabilização da base e corrige o fluxo recorrente do Soma+: assinatura individual criada pela API, webhooks de assinatura e cobrança, reconciliação e cancelamento pelo app.

## Requisitos

- Node.js 22
- npm 10 ou superior
- Flutter apenas para trabalhar no protótipo em `mobile/`

## Instalação reproduzível

```bash
npm ci
npm run check:env:examples
cp apps/api/demo.env.example apps/api/.env
cp apps/web/demo.env.example apps/web/.env
npm run check:env
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:4000/api`
- Saúde: `http://localhost:4000/api/health`
- Swagger: `http://localhost:4000/docs` apenas quando `SWAGGER_ENABLED=true`

Para integração real, copie os arquivos `.env.example`, preencha Firebase e Google Sheets e mantenha `DEMO_MODE=false`. A API recusa inicialização em produção com modo demo, URLs sem HTTPS ou webhook financeiro inseguro.

## Gates da entrega

```bash
npm run check:env:examples
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:production
```

## Execução local com contêineres

```bash
docker compose up --build
```

O Compose é deliberadamente demonstrativo e não deve ser reutilizado como arquivo de produção. Em produção, injete os segredos pelo provedor, use HTTPS e compile o frontend com `VITE_DEMO_MODE=false`.

## Publicação

Leia [docs/SPRINT-7.2.1-PRODUCAO.md](docs/SPRINT-7.2.1-PRODUCAO.md) e [MERCADO-PAGO-WEBHOOK-CONFIGURACAO.md](MERCADO-PAGO-WEBHOOK-CONFIGURACAO.md) antes de promover uma versão. Os guias incluem backup, novas abas, smoke tests, observabilidade e rollback.

## Mobile

`mobile/` continua sendo um protótipo compartilhado, não um binário homologado para as lojas. Para desenvolvimento:

```bash
cd mobile
flutter pub get
flutter run --dart-define=DEMO_MODE=true --dart-define=API_URL=http://10.0.2.2:4000/api
```
