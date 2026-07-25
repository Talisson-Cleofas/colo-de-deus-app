# Sprint 6.2 — Implementações e unificação

## Menu principal

O menu lateral foi simplificado. Agora contém apenas os módulos principais:

- Início
- Lectio Divina
- Agenda
- Eventos
- Soma+
- Células
- Cenáculos
- Membros
- Notificações
- Perfil

## Submódulos

- **Membros**: diretório e mapa de membros.
- **Perfil**: dados pessoais e configurações.
- **Células**: lista e mapa das células.
- **Soma+**: contribuições/PIX, relatórios e Google Drive.

As rotas antigas continuam funcionando por redirecionamento.

## Notificações

A central permite marcar como lida, marcar todas, excluir e manter o estado no navegador. O CSV `Notificacoes.csv` foi incluído como modelo para a próxima conexão com o Google Sheets/Firebase Cloud Messaging.
