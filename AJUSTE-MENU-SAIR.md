# Ajuste do menu lateral

O botão **Sair** foi corrigido para não ocupar o espaço livre da sidebar.

## Alterações

- altura fixa de 46 px;
- `flex-grow` desativado;
- divisória discreta antes do botão;
- menu principal com rolagem independente;
- botão mantido no rodapé sem cobrir itens;
- largura do drawer mobile limitada a 88% da tela;
- espaçamento e tipografia alinhados aos demais itens.

Arquivo alterado:

`apps/web/src/layout/AppShell.tsx`
