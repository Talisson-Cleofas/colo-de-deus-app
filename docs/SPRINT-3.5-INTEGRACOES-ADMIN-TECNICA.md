# Sprint 3.5 — Integrações e Administração Técnica

Área exclusiva para ADMIN em `/configuracoes/tecnico`.

## Recursos
- Status configurado/não configurado sem exposição de credenciais.
- Testes de Google Sheets, Google Drive, Firebase, Google Maps e Mercado Pago.
- Validação de abas e cabeçalhos.
- Criação automática de abas ausentes e sincronização manual.
- Data e status do último sincronismo.
- Histórico técnico e de erros em `IntegracoesHistorico`.
- Configurações técnicas de notificações.
- Administração de permissões na aba `Permissoes`.

## Nova aba
`IntegracoesHistorico`

Cabeçalho:
`id | nivel | categoria | acao | mensagem | detalhes | usuario_id | usuario_email | criado_em`

Credenciais permanecem exclusivamente nas variáveis de ambiente do backend.
