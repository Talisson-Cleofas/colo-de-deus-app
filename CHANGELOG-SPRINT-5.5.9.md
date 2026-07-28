# Sprint 5.5.9 — Permissões Visíveis e Escopo por Ministério

## Matriz de acesso

- A tela agora consulta `GET /api/rbac/permissions` e `GET /api/rbac/profiles/:profileCode/permissions`.
- Todas as permissões são exibidas por módulo, inclusive permissões negadas e inativas.
- Cada item apresenta nome, código técnico, descrição, módulo, ação, escopo, status e checkbox.
- A matriz é editada localmente e persistida pelo botão **Salvar matriz**.
- O cabeçalho apresenta o contador de permissões concedidas.
- Novo endpoint em lote: `PUT /api/rbac/profiles/:profileCode/permissions`.

## Escopo por ministério

- Novo `MinistryModuleGuard` global.
- Novo decorator `@RequireMinistryModule(...)`.
- Novo mapa central `MINISTRY_PERMISSION_MAP`.
- Ministérios passam a possuir `codigo` estável na planilha e na entidade.
- O líder de ministério só executa ações do módulo correspondente ao seu ministério.
- Administrador, Desenvolvedor e Líder da Missão mantêm acesso amplo.
- Líder de Célula continua sujeito ao escopo da própria célula.

## Módulos protegidos

- Células e presenças.
- Cenáculos.
- Eventos.
- Financeiro/Soma+.
- Comunicação e notificações.

## Auditoria

- Salvamento da matriz registrado como evento `PERMISSION`.
- Autorizações e negações por módulo de ministério são registradas na aba Auditoria.

## Compatibilidade

As permissões antigas `*:MANAGE` foram preservadas e as permissões granulares `CREATE`, `UPDATE`, `DELETE`, `WRITE` e `SEND` foram adicionadas.
