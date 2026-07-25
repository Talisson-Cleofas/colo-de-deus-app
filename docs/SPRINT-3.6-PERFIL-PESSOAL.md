# Sprint 3.6 — Perfil Pessoal

## Endpoints
- `GET /api/members/me/profile`: dados pessoais e vínculos do usuário autenticado.
- `PUT /api/members/:id`: atualização dos campos pessoais permitidos.
- `GET /api/notifications/preferences`: preferências atuais.
- `PATCH /api/notifications/preferences`: atualização das preferências.

## Campos editáveis pelo membro
Foto por URL pública, telefone, data de nascimento, cidade, estado, biografia, Instagram e dons.
Nome é enviado pela tela, mas o backend mantém a política de campos seguros; e-mail, função, perfil, situação, ministério, célula e formador permanecem administrativos.

## Google Sheets
Não requer nova aba. Utiliza `Membros`, `Participantes`, `Ministérios`, `Células`, `Cenáculos` e `NotificacoesPreferencias`.
