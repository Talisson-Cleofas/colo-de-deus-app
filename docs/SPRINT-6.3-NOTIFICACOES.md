# Sprint 6.3 — Notificações

A central e o sino do dashboard usam uma única fonte de dados reativa.

## Comportamentos

- Clique no sino: abre `/notificacoes`.
- Badge: mostra apenas o total não lido.
- Ao marcar uma notificação como lida, o badge é atualizado imediatamente.
- Ao marcar todas como lidas, o badge desaparece.
- Ao excluir uma notificação não lida, o contador também diminui.
- As alterações permanecem após atualizar o navegador por meio do `localStorage`.
