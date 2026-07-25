# Sprint 2.7 — Gestão de Células

## Entregas

- criação de células por ADMIN e Líder de Ministério;
- Líder de Ministério limitado aos próprios ministérios;
- definição de líder e vice-líder por ID de membro;
- vínculo e remoção de participantes pela aba Participantes;
- endereço, bairro, cidade, estado, latitude, longitude, dia e horário;
- integração com o mapa já existente;
- edição protegida: ADMIN, Líder de Ministério responsável e Líder da própria célula;
- Líder de Célula não pode trocar liderança ou ministério;
- registro e atualização de presença por data;
- ausência com justificativa;
- persistência nas abas Células, Participantes e Presenças.

## Permissões

- ADMIN: cria e administra todas as células.
- MINISTRY_LEADER: cria e administra células dos ministérios em que é líder ou vice-líder.
- CELL_LEADER: edita somente a célula cujo lider_id corresponde ao próprio membro e registra presença.
- MEMBER: consulta as células, sem acesso de gestão.

## Validação

- npm run typecheck: aprovado.
- npm run build: aprovado.
