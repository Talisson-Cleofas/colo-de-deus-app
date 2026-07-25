# Sprint 2.3.3 — Gestão de Ministérios

A página **Ministérios** agora possui CRUD integrado ao Google Sheets.

## Permissões

- ADMIN: cria, edita, reativa e desativa ministérios.
- Líder de Ministério, Líder de Célula e Membro: visualizam ministérios ativos.
- As regras são validadas no frontend e no backend.

## Google Sheets

A API cria automaticamente a aba `Ministérios` quando ela não existir e inclui os cabeçalhos:

`id | nome | descricao | lider_email | vice_lider_email | cor | icone | criado_em | ativo | observacoes`

A conta de serviço precisa ter permissão de **Editor** na planilha para criar a aba e gravar os registros.
