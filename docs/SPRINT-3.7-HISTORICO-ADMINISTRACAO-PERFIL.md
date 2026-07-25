# Sprint 3.7 — Histórico e Administração de Perfil

## Entregas
- Perfil público interno com dados não sensíveis.
- Perfil completo para o próprio membro, lideranças dentro do escopo e ADMIN.
- Histórico de presenças, faltas e justificativas.
- Confirmações e ausências em eventos.
- Formações, progresso e formador.
- Responsabilidades de liderança.
- Preparação e leitura do histórico do Soma+.
- Histórico de alterações administrativas.
- Administração exclusiva por ADMIN para perfil de acesso, status, função, vínculos, liderança e formador.
- Auditoria na aba `Histórico`.
- Validação de autorização no backend.

## Endpoints
- `GET /api/members/:id/public-profile`
- `GET /api/members/:id/profile-complete`
- `PATCH /api/members/:id/admin` (ADMIN)

## Abas utilizadas
Membros, Participantes, Presenças, Eventos, ConfirmacoesEventos, Formacoes, Formandos, Soma, Ministérios, Células, Cenáculos e Histórico.
