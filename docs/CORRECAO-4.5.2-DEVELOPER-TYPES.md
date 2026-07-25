# Correção 4.5.2 — Tipagem DEVELOPER

Corrige a união de tipos de `MemberRow.profile` e `CreateMemberDto.profile`, incluindo `DEVELOPER`.

O aviso `data_envio: APP` não é erro de compilação. Ele indica que uma linha já existente na aba `Notificações` possui `APP` na coluna `data_envio`. Revise a linha indicada e mova `APP` para a coluna `canal`, preenchendo `data_envio` com uma data ISO ou deixando-a vazia.
