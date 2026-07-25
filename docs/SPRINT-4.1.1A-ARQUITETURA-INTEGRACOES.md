# Sprint 4.1.1A — Arquitetura de Integrações

Esta versão mantém a Sprint 4.1.1 original intacta e cria uma variante compatível com as novas abas:

- `Lectio`
- `Integracoes`
- `HistoricoIntegracoes`
- `ConfiguracoesSistema`

## Migração

1. Faça backup da planilha atual.
2. Crie as quatro abas com os cabeçalhos de `MODELO-ABAS-4.1.1A-COPIAR-COLAR.txt`.
3. Copie os registros válidos da antiga `Lectio` para a nova, removendo as colunas técnicas que deixaram de existir.
4. Migre as chaves da Lectio da antiga `Configurações` para `Integracoes`, usando `modulo=Lectio`.
5. Migre configurações gerais para `ConfiguracoesSistema`, usando `categoria=Sistema`.
6. Não copie `LectioSincronizacoes`; o novo histórico começa em `HistoricoIntegracoes`.
7. Inicie a API e use a sincronização de estrutura no painel técnico para validar os cabeçalhos.

## Mudanças de código

- `GoogleSheetsService` reconhece os novos schemas por meio de `SHEET_SCHEMAS`.
- `IntegrationConfigService` centraliza leitura e gravação de integrações.
- Lectio lê e grava configurações em `Integracoes`.
- A retenção registra eventos em `HistoricoIntegracoes`.
- Configurações gerais e técnicas usam `ConfiguracoesSistema`.
- Nova tela administrativa em `/configuracoes/integracoes`.

## Compatibilidade

Este pacote não usa mais `LectioSincronizacoes` nem `Configurações`. Para continuar com essas abas, permaneça na Sprint 4.1.1 original.
