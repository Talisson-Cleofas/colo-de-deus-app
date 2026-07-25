# Sprint 4.2.2 — Migração Maps e Drive

1. Configure as credenciais em `apps/api/.env`.
2. Inicie API e Web.
3. Entre como ADMIN.
4. Acesse **Configurações > Administração técnica > Google Sheets**.
5. Clique em **Executar migração segura**.

A migração adiciona somente colunas ausentes, cria as abas Arquivos, PastasDrive, HistoricoArquivos, Sistema e Migracoes, preserva linhas existentes e pode ser executada novamente sem duplicações.

Endpoints:
- `GET /api/admin/migrations/maps-drive/preview`
- `POST /api/admin/migrations/maps-drive/run`
- `GET /api/admin/migrations/maps-drive/status`
