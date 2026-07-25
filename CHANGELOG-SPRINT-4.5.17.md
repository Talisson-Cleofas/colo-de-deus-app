# Sprint 4.5.17 — Menu, exclusões e foto de perfil

## Alterações

- O perfil MEMBER não visualiza o submenu Missões.
- A rota /missoes também bloqueia acesso direto para MEMBER e encaminha para 403.
- Botões de exclusão de eventos, células, cenáculos, participantes e membros ficam ocultos para MEMBER.
- As proteções do backend da Sprint 4.5.16 continuam ativas.
- Todos os usuários autenticados podem selecionar uma foto da galeria, câmera ou armazenamento do próprio dispositivo na página Perfil.
- O envio utiliza a categoria MEMBER_PHOTO no Google Drive e vincula a imagem ao próprio cadastro.
- A opção de URL pública foi mantida como alternativa.
