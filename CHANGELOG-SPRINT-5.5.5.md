# Sprint 5.5.5 — Dashboard Enterprise Stabilization

## Entregas

- Header único no `AppShell` para membros, líderes e administradores.
- Remoção do avatar e sino duplicados da página inicial.
- Header responsivo para desktop, Android, iPhone e PWA.
- Remoção do conflito entre `GET /api/dashboard` e o dashboard administrativo.
- Dashboard administrativo mantido exclusivamente em `GET /api/admin/dashboard`.
- Contrato tipado e estável para Lectio, notificações, aniversários e eventos.
- Fallback independente por seção na API, com logs sem derrubar o restante do dashboard.
- Normalização defensiva no `useMemberDashboard` para respostas incompletas ou antigas.
- Cards tolerantes a dados ausentes, arrays inválidos e campos opcionais.
- Cache do Service Worker atualizado para `colo-v5-5-5`.
- Versão do monorepo, API e frontend atualizada para `5.5.5`.
