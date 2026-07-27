# Sprint 5.5.5 — Dashboard Enterprise Stabilization

## Rotas

- `GET /api/dashboard`: dashboard agregado do membro.
- `GET /api/dashboard/member`: alias compatível do dashboard do membro.
- `GET /api/admin/dashboard`: dashboard administrativo.

O controller administrativo duplicado que também atendia `/api/dashboard` foi removido.

## Contrato do dashboard do membro

A API sempre devolve as quatro seções abaixo, mesmo quando uma integração falha:

- `lectio`
- `notifications`
- `birthdays`
- `events`

Cada seção possui `status`, `data`, `updatedAt` e, quando necessário, `error`.

## Header

O `AppShell` é a única fonte do header para todos os perfis. O sino e o avatar foram removidos da `DashboardPage`, eliminando a duplicidade no celular. O header agora é fixo, responsivo e reutilizado por membros e administradores.

## Validação responsiva

Os breakpoints foram revisados para:

- celulares estreitos;
- iPhone/Safari;
- Android/Chrome;
- PWA instalada;
- tablets;
- desktop com sidebar permanente.

## Comandos de validação

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run dev
```

Neste pacote, os arquivos alterados foram submetidos a verificação sintática isolada com TypeScript 5.8.3. A validação integral dependente de `npm ci` deve ser executada na máquina do projeto porque o registro de pacotes do ambiente de geração respondeu HTTP 503.
