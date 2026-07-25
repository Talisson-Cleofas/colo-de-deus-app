# Sprint 4.1.3.2 — Leituras Estruturadas

A aba `Lectio` passa a separar Primeira Leitura, Salmo Responsorial, Segunda Leitura opcional, Aclamação e Evangelho em campos próprios.

## Migração automática

Na primeira leitura da aba, o `LectioMigrationService` compara o cabeçalho existente com o modelo atual, preserva os registros por nome de coluna e reescreve a aba com as novas colunas. O campo antigo `aclamacao` é migrado para `aclamacao_texto`.

## Validação da sincronização

Os providers só aceitam conteúdo com Primeira Leitura, Salmo e Evangelho válidos. A Segunda Leitura é opcional e fica com campos vazios quando não existir.

## Cabeçalho da aba Lectio

```text
id	data	titulo	celebracao	tempo_liturgico	cor_liturgica	primeira_leitura_referencia	primeira_leitura_titulo	primeira_leitura_texto	salmo_referencia	salmo_responsorio	salmo_texto	segunda_leitura_referencia	segunda_leitura_titulo	segunda_leitura_texto	aclamacao_referencia	aclamacao_texto	evangelho_referencia	evangelho_titulo	evangelho_texto	antifona_entrada	antifona_comunhao	reflexao	oracao	fonte	status	protegido	sincronizado_em	atualizado_em	ativo
```
