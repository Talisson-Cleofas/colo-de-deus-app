# Correção do perfil DEVELOPER

## Problema corrigido

O Google Sheets retornava `DEVELOPER`, mas `GoogleSheetsService.parseProfile()` não reconhecia esse valor e o convertia para `MEMBER`.

## Ajustes aplicados

- Leitura de `DEVELOPER` e `DESENVOLVEDOR` no backend.
- Acesso elevado do desenvolvedor nas validações administrativas antigas.
- Cadastro e edição de membros aceitando `DEVELOPER`.
- Dashboard administrativo para desenvolvedor.
- Configurações, relatórios, eventos, notificações, ministérios, células, cenáculos e aniversários revisados.
- Lista de perfis do frontend atualizada.

## Após atualizar

1. Pare frontend e backend.
2. Substitua os arquivos pela versão corrigida.
3. Execute `npm install` na raiz.
4. Execute `npm run dev`.
5. Saia da aplicação e entre novamente para renovar a sessão.
6. Se necessário, limpe o item `colo:user` do Local Storage.
