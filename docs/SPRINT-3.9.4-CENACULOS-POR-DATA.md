# Sprint 3.9.4 — Cenáculos por Data e Histórico

## Alterações

- Data e horário inicial e final obrigatórios para cenáculos.
- Status calculado automaticamente após o encerramento.
- Abas Próximos, Encerrados e Cancelados.
- Filtros por data inicial e final.
- Histórico preservado sem excluir participantes, presenças ou relatórios.
- Duplicação de cenáculo copiando vínculos, responsáveis e participantes.
- Encerramento antecipado, cancelamento e reabertura.
- Cenáculos encerrados continuam acessíveis pela página de detalhes.

## Cabeçalho atualizado da aba Cenáculos

```text
id	nome	responsavel_id	vice_responsavel_id	ministerio_id	celula_id	endereco	bairro	cidade	estado	latitude	longitude	data	horario	data_fim	horario_fim	recorrente	status	encerrado_em	ativo	criado_em	atualizado_em
```

A sincronização técnica administrativa pode criar os campos ausentes automaticamente.

## Endpoints

- `GET /api/communities?type=CENACLE&status=UPCOMING|FINISHED|CANCELLED`
- `POST /api/communities/:id/duplicate`
- `POST /api/communities/:id/close`
- `POST /api/communities/:id/reopen`
- `POST /api/communities/:id/cancel`
