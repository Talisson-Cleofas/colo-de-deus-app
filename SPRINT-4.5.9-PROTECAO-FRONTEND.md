# Sprint 4.5.9 — Proteção do Frontend

## Entregas

- Todos os itens do menu lateral são renderizados dentro de `<Can />`.
- Menus sem permissão são ocultados automaticamente.
- Rotas funcionais usam `PermissionRoute` com `permission` ou `anyOf`.
- Acesso direto por URL sem autorização redireciona para `/sem-permissao`.
- Nova página `403 — Sem permissão`, com retorno e acesso ao início.
- Tela de carregamento durante a resolução das permissões para evitar redirecionamento prematuro.
- Proteção aplicada a páginas de detalhes, presença, configurações, auditoria, lixeira e RBAC.

## Segurança

A proteção do frontend melhora a experiência e evita exposição visual de funções. A autorização real continua sendo validada também pelo backend e seus guards.
