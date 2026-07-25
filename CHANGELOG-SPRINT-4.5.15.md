# Sprint 4.5.15 — Lectio automática e parser corrigido

## Correções

- Ignora cabeçalhos duplicados de Primeira Leitura antes do conteúdo real.
- Descarta candidatos de menu com menos de 20 caracteres.
- Usa a fórmula litúrgica `Leitura do/da...` como âncora estrutural quando necessário.
- Mantém CNBB como principal e Canção Nova como fallback.
- Força nova consulta na execução automática para não reutilizar cache inválido.

## Sincronização automática

A API agenda a sincronização todos os dias às 00:10 no fuso `America/Sao_Paulo`.

```env
LECTIO_AUTO_SYNC_ENABLED=true
LECTIO_AUTO_SYNC_TIMEZONE=America/Sao_Paulo
LECTIO_AUTO_SYNC_HOUR=0
LECTIO_AUTO_SYNC_MINUTE=10
```

O agendamento ocorre dentro da API NestJS. Portanto, o backend precisa permanecer online às 00:10. Em hospedagens que suspendem a aplicação por inatividade, configure um cron externo para chamar `POST /api/lectio/sync?force=true` ou mantenha a instância ativa.

## Causa raiz confirmada

O normalizador quebrava a frase bíblica `A palavra do Senhor foi-me dirigida` antes de `palavra do Senhor`. Em seguida, o parser confundia esse trecho com o encerramento `Palavra do Senhor` e salvava apenas `1 A` (3 caracteres). A quebra genérica foi removida e o encerramento agora só é reconhecido no início de uma linha ou depois do fim de uma frase.
