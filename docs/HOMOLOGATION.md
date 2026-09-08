# Ambiente de homologação

O serviço `colo-avaliacoes-qa` é o ambiente permanente de homologação do aplicativo Colo de Deus.

## Garantias de isolamento

- Usa exclusivamente dados fictícios mantidos em memória.
- Não acessa Google Sheets, Google Drive ou Firebase de produção.
- Não envia notificações, e-mails ou mensagens externas.
- Não cria cobranças nem processa pagamentos.
- Reiniciar ou publicar o serviço apaga os dados temporários.

O processo só inicia quando todas estas variáveis estão configuradas:

```text
APP_ENV=homologation
HOMOLOGATION_MODE=true
EVALUATIONS_QA=true
EXTERNAL_INTEGRATIONS_ENABLED=false
```

## Uso

A rota `/test` permite escolher um perfil fictício. As funcionalidades liberadas para homologação devem usar somente os adaptadores em memória deste servidor. Novos módulos precisam incluir seus endpoints fictícios e testes antes de serem disponibilizados aqui.

## Verificação

`GET /api/health` deve informar `environment: homologation`, `storage: memory`, `externalIntegrations: false` e `payments: false`.
