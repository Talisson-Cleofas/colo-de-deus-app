# Sprint 4.1.1 — Base da Lectio + retenção

## Entregas

- Estrutura renovada do módulo Lectio no NestJS e no React.
- Cadastro e edição manual restritos ao perfil ADMIN.
- Abas Google Sheets `Lectio` e `LectioSincronizacoes`.
- Fontes CNBB e Canção Nova configuráveis, ainda sem importação automática nesta entrega.
- Retenção configurável de 1 a 30 dias, com padrão de 7 dias.
- Limpeza manual e automática após cadastro, edição e alteração das configurações.
- Registros `MANUAL`, `REVISADA` ou marcados como protegidos não são apagados.
- Histórico técnico resumido das execuções de limpeza.

## Variáveis opcionais da API

```env
LECTIO_PRIMARY_SOURCE=CNBB
LECTIO_FALLBACK_SOURCE=CANCAO_NOVA
LECTIO_CNBB_ENABLED=true
LECTIO_CANCAO_NOVA_ENABLED=true
LECTIO_RETENTION_DAYS=7
LECTIO_DELETE_OLD_RECORDS=true
```

As configurações salvas pelo painel administrativo na aba `Configurações` têm prioridade sobre o `.env`.

## Cabeçalho da aba Lectio

```text
id	data	titulo	celebracao	tempo_liturgico	cor_liturgica	primeira_leitura_referencia	primeira_leitura_texto	salmo_referencia	salmo_responsorio	salmo_texto	segunda_leitura_referencia	segunda_leitura_texto	aclamacao	evangelho_referencia	evangelho_texto	antifona_entrada	antifona_comunhao	reflexao	oracao	fonte	fonte_url	status	protegido	erro_sincronizacao	sincronizado_em	atualizado_em	removido_em	ativo
```

## Cabeçalho da aba LectioSincronizacoes

```text
id	data_liturgia	fonte_principal	fonte_utilizada	status	tentativas	registros_criados	registros_atualizados	registros_removidos	registros_protegidos	erro	iniciado_em	finalizado_em
```

## Migração da aba antiga

A estrutura anterior de `Lectio` tinha colunas diferentes. Antes de usar a versão real com Google Sheets:

1. faça uma cópia de segurança da planilha;
2. substitua o cabeçalho da aba `Lectio` pelo novo cabeçalho;
3. crie a aba `LectioSincronizacoes` ou use a sincronização técnica para criá-la;
4. recadastre manualmente conteúdos que devam ser preservados.

A limpeza só remove registros sincronizados fora do período. Conteúdo manual ou revisado permanece protegido por padrão.
