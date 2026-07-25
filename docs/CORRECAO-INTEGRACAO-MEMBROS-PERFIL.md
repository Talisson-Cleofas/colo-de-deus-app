# Correção — Integração entre Área de Membros e Perfil

## Ajustes

- O perfil pessoal força a leitura atualizada da aba `Membros`, evitando exibir dados antigos mantidos em cache.
- Foi criado o endpoint `PATCH /api/members/me/profile`, que identifica o membro autenticado por `memberId`, `id` ou e-mail.
- Alterações feitas pela Área de Membros passam a aparecer no Perfil na próxima abertura ou atualização da página.
- O próprio membro pode editar o campo `formador`.
- A data de nascimento é normalizada para `AAAA-MM-DD`, mesmo quando o Google Sheets devolve `DD/MM/AAAA`.
- A data salva volta corretamente ao campo de edição do perfil.
- Campos administrativos como perfil de acesso, função, vínculos e situação continuam protegidos no backend.
