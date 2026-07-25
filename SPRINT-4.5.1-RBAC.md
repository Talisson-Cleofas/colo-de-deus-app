# Sprint 4.5.1 — Fundação do RBAC

## Entregas

### Backend
- Enums `ProfileCode`, `Permission` e `PermissionScope`.
- Interfaces de perfil, permissão, vínculo perfil-permissão e permissões do usuário.
- `PermissionService` com cache, defaults seguros e leitura da aba `PerfisPermissoes`.
- `PermissionsGuard` global e decorator `@RequirePermissions()`.
- Estrutura de `PermissionMiddleware` para rotas que precisem de aplicação explícita.
- Endpoints `GET /api/rbac/me` e `GET /api/rbac/catalog`.
- Novo perfil `DEVELOPER`, mantendo compatibilidade com ADMIN, líderes e membros.

### Frontend
- `PermissionProvider` e `PermissionContext`.
- Hook `usePermission()`.
- Componente `<Can>`.
- `PermissionRoute` para proteção por permissão.
- Tela `/configuracoes/rbac` com as seções Perfis, Permissões e Perfis × Permissões.

### Google Sheets
A sincronização técnica passa a garantir estas abas:
- `Perfis`: catálogo dos perfis.
- `Permissoes`: catálogo das permissões.
- `PerfisPermissoes`: vínculo, decisão e escopo por perfil.

## Cabeçalhos
- Perfis: `id,codigo,nome,descricao,nivel,ativo,criado_em,atualizado_em`
- Permissoes: `id,codigo,recurso,acao,descricao,ativo,criado_em,atualizado_em`
- PerfisPermissoes: `id,perfil_codigo,permissao_codigo,permitido,escopo,ativo,criado_em,atualizado_em`

## Como testar
1. Execute `npm install` na raiz.
2. Execute `npm run typecheck` e `npm run build`.
3. Inicie com `npm run dev`.
4. Entre como ADMIN ou DEVELOPER.
5. Abra **Configurações → Administração técnica → Google Sheets** e clique em **Criar abas e sincronizar**.
6. Abra **Configurações → Perfis e permissões**.

O serviço usa permissões padrão quando a aba ainda está vazia, evitando bloquear o primeiro acesso administrativo.
