# Reconstrução da Sprint 2

Esta versão substitui os arquivos JSX compactados e inválidos por componentes TypeScript/React formatados e estruturados.

## Correções principais

- `theme.ts` reescrito com fechamento correto dos objetos do Material UI.
- `DashboardPage.tsx` reconstruído sem atributos JSX inválidos.
- `MemberCard.tsx` reconstruído com valores decimais em expressões JSX válidas.
- `MembersPage.tsx`, `MemberProfilePage.tsx` e `MinistriesPage.tsx` reconstruídos.
- Uso de CSS Grid por `Box`, evitando incompatibilidades entre versões do componente Grid do Material UI.
- Proteção para listas de dons vazias.
- Código validado sintaticamente com o compilador TypeScript.

## Executar

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
npm install
npm run dev
```

Frontend: http://localhost:5173
API: http://localhost:4000/api
Swagger: http://localhost:4000/docs
