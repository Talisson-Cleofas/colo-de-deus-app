# Sprint 5.6.1 — Agenda Missionária: Fundação e Formulário

## Entregas

### Backend (NestJS)

- Módulo `MissionaryAgendaModule` registrado na aplicação.
- Entidade de domínio e tipos de agenda missionária.
- DTOs de criação e edição com validação de campos, datas, horários, UF, CEP e limites.
- Rotas autenticadas e protegidas por RBAC:
  - `GET /api/missionary-agenda`
  - `GET /api/missionary-agenda/options`
  - `GET /api/missionary-agenda/:id`
  - `POST /api/missionary-agenda`
  - `PATCH /api/missionary-agenda/:id`
  - `POST /api/missionary-agenda/:id/submit`
  - `POST /api/missionary-agenda/:id/approve`
  - `POST /api/missionary-agenda/:id/reject`
  - `POST /api/missionary-agenda/:id/send`
  - `GET /api/missionary-agenda/:id/history`
- Serviço com listagem, filtros, cadastro, edição, validação de período e referências de responsável/ministério.
- Fluxo de aprovação por estado e perfil:
  - líder da agenda envia para aprovação do líder de missão;
  - líder de missão aprova e encaminha ao líder do ministério;
  - líder do ministério seleciona e envia os membros de seu ministério;
  - em caso de não aprovação, a agenda retorna ao líder responsável com o motivo para edição e reenvio.
- Visibilidade limitada ao papel de cada participante e transições inválidas bloqueadas no backend.
- Histórico auditável de todas as ações e notificações individuais em cada mudança de responsável.
- Repositório dedicado na camada de persistência, mantendo o Google Sheets desacoplado do serviço.
- Novas permissões `MISSIONARY_AGENDA:READ`, `CREATE` e `UPDATE` com matriz padrão por perfil.

### Google Sheets

- Aba `AgendaMissionaria` criada no banco principal, com campos de auditoria do fluxo.
- Abas `AgendaMissionariaParticipantes` e `AgendaMissionariaHistorico` para membros enviados e trilha de estados.
- Cabeçalho congelado e validações nativas para `tipo` e `status`.

### Frontend (React + Material UI)

- Página `AgendaMissionariaPage` com busca, filtros, cartões e ações por permissão.
- Componente `AgendaMissionariaForm` separado e reutilizável.
- Formulário responsivo dividido em informações principais, período, localização e organização.
- Validações no cliente alinhadas aos DTOs da API.
- Criação e edição integradas à API.
- Ações contextuais para enviar, aprovar, não aprovar e selecionar membros.
- Diálogo obrigatório para o motivo da não aprovação e seleção restrita aos membros do ministério responsável.
- Exibição do estágio atual, motivo de devolução e membros enviados.
- Rota `/agenda-missionaria` e item próprio no menu lateral.

## Preparação para próximas sprints

- Colunas reservadas para recorrência e notificações, inicialmente desativadas.
- Identificadores de responsável e ministério prontos para participantes e escopo.
- Estrutura compatível com futura visualização em calendário.

## Validação

- `npm run typecheck`: aprovado.
- `npm run build`: aprovado.
- `npm test`: 19 testes aprovados, incluindo os caminhos de aprovação e não aprovação, controle por perfil, seleção de membros e rejeição de período inválido.
