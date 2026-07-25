# Sprint 2.4 — Estrutura padronizada do Google Sheets

Esta versão atualiza a API para trabalhar com os cabeçalhos padronizados das abas:

Membros, Usuarios, Perfis, Permissoes, Ministérios, Células, Cenáculos, Participantes, Presenças, Formacoes, Formandos, Lectio, Eventos, ConfirmacoesEventos, Soma, Notificações, NotificacoesLeituras, Configurações e Histórico.

## Inicialização automática

Com um usuário ADMIN autenticado, execute:

```http
POST /api/admin/sheets/initialize
```

A operação cria abas ausentes e adiciona cabeçalhos somente em abas vazias. Ela não substitui cabeçalhos existentes nem apaga registros.

Para consultar incompatibilidades:

```http
GET /api/admin/sheets/schema
```

Cada item retorna `valid: true` quando a ordem dos cabeçalhos coincide com a estrutura esperada.

## Atenção na migração

Faça uma cópia da planilha antes de reorganizar colunas. Abas antigas como `Comunidades`, `ParticipantesComunidades` e `Presencas` foram substituídas por `Células`, `Cenáculos`, `Participantes` e `Presenças`.

Os relacionamentos de liderança passam a usar IDs de membros em vez de nomes ou e-mails. O frontend continua exibindo e selecionando membros por nome/e-mail, enquanto a API converte esses valores para IDs ao salvar.
