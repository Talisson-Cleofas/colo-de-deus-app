# Sprint 4.3.2 — Correção da sincronização do Google Sheets

## Correções

- Abas inexistentes são criadas automaticamente.
- Colunas ausentes são acrescentadas ao final do cabeçalho sem apagar ou deslocar dados.
- A sincronização é idempotente e pode ser repetida.
- Escritas e atualizações passam a respeitar a ordem real dos cabeçalhos da planilha.
- Falha na reconciliação de vínculos não desfaz a criação das abas; é retornada como alerta.
- O endpoint retorna relatório de abas criadas e colunas adicionadas.
- Erros do Google Sheets agora retornam uma mensagem mais detalhada em vez de 503 genérico.

## Endpoint

POST /api/technical-admin/synchronize

## Requisitos

- DEMO_MODE=false
- GOOGLE_SHEETS_ID configurado
- conta de serviço configurada
- planilha compartilhada como Editor com a conta de serviço
- Google Sheets API habilitada no projeto Google Cloud
