# Sprint 4.1.3.5 — Dashboard Dinâmico da Área de Membros

## Entregas
- Endpoint agregado `GET /dashboard/member`.
- Lectio do dia lida da aba `Lectio`, com referência e trecho real do Evangelho.
- Notificações e total não lido lidos das abas de notificações.
- Aniversários dos próximos sete dias lidos da aba `Membros`.
- Próximos eventos publicados lidos da aba `Eventos`.
- Remoção da frase fixa de Salmo 119,105 e dos eventos demonstrativos.
- Estados independentes de carregamento, vazio e erro para cada seção.
- Atualização ao recuperar foco e após mudanças em notificações/Lectio.

## Endpoint
`GET /dashboard/member`

Uma falha em uma fonte não impede o carregamento das demais seções.
