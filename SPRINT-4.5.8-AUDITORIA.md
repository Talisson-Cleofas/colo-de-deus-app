# Sprint 4.5.8 — Auditoria

## Entregas
- Aba `Auditoria` criada automaticamente no Google Sheets.
- Registro automático de login, logout, criação, edição, exclusão, restauração, permissões e alterações.
- Dados registrados: usuário, perfil, módulo, entidade, registro, descrição, payload sanitizado, IP, user-agent e data/hora.
- Tokens, senhas e chaves privadas são ocultados.
- A falha da auditoria nunca interrompe a operação principal.
- Tela `/auditoria` com filtros por ação, módulo, usuário, período e busca livre.
- Acesso restrito a Desenvolvedor, Líder Missão e ADMIN legado.
