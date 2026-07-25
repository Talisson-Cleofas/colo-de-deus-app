# Sprint 4.1.3.8 — Motor de Leitura de Notificações

## Fonte única de verdade

A aplicação passa a consumir `GET /notifications/state`. O retorno reúne catálogo, estado de leitura e contadores do membro autenticado.

## Regras

- Ausência de linha em `NotificacoesLeituras`: não lida.
- `lida = FALSE`: não lida.
- `lida = TRUE`: lida.
- A leitura é identificada por `notificacao_id + membro_id`.
- O campo oficial de data é `data_leitura`; `lida_em` continua aceito para compatibilidade.

## Abas

### Notificações
Catálogo de mensagens. Não armazena estado individual de leitura.

### NotificacoesLeituras

```text
id	notificacao_id	membro_id	lida	data_leitura	criado_em	atualizado_em
```

## Endpoint

```http
GET /notifications/state
```

```json
{
  "notifications": [],
  "unreadCount": 0,
  "readCount": 0,
  "total": 0,
  "updatedAt": "2026-07-21T00:00:00.000Z"
}
```

Sidebar, sino, dashboard e Central devem usar o hook compartilhado `useNotificationState()`.
