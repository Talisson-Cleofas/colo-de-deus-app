# Sprint 2.9 — Gestão de Eventos

## Entregas

- Criação e edição de eventos.
- Fluxo de rascunho, publicação e despublicação.
- Eventos com abrangência geral, ministério, célula ou cenáculo.
- Evento geral restrito ao ADMIN.
- Eventos de áreas restritos aos líderes e responsáveis vinculados.
- Confirmação de presença pelo membro.
- Ausência com justificativa, com atualização do registro existente.
- Caixa de consulta de confirmações e justificativas limitada aos líderes responsáveis.
- Filtros por categoria, abrangência e busca textual.

## Abas utilizadas

### Eventos

`id, titulo, descricao, tipo, ministerio_id, celula_id, cenaculo_id, local, endereco, latitude, longitude, inicio, fim, imagem, limite_participantes, confirmacao_obrigatoria, publicado, criado_por, criado_em, atualizado_em`

### ConfirmacoesEventos

`id, evento_id, membro_id, status, justificativa, ministerio_id, destinatarios, visualizado, respondido_por, respondido_em, situacao, criado_em, atualizado_em`

## Regras de permissão

- ADMIN: cria evento geral ou de qualquer área, edita e publica todos.
- Líder de Ministério: cria, edita e publica eventos dos ministérios sob sua liderança e das células/cenáculos vinculados.
- Líder de Célula: cria, edita e publica eventos da própria célula.
- Responsável ou vice-responsável de Cenáculo: cria, edita e publica eventos do próprio cenáculo.
- Membro: consulta eventos publicados, confirma presença ou envia justificativa.

As autorizações são verificadas no backend.
