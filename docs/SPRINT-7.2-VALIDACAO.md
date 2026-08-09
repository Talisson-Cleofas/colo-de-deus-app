# Evidências de validação — Sprint 7.2

Data: 31/07/2026

## Gates executados

| Gate | Resultado |
| --- | --- |
| `npm ci --ignore-scripts` | Aprovado; lockfile reproduzível |
| `npm run check:env:examples` | Aprovado para templates real e demo |
| `npm run lint` | Aprovado, sem erros ou avisos na execução final |
| `npm run typecheck` | Aprovado em API e web |
| `npm test` | 10/10 testes aprovados |
| `npm run build` | Aprovado em API e web |
| `npm run audit:production` | Aprovado; zero críticos e nenhum advisory alto fora das exceções revisadas |

O frontend foi dividido em chunks; o maior bundle final ficou abaixo de 375 kB minificado, sem o aviso anterior de chunk superior a 500 kB.

## Smoke tests

- API iniciou em modo demo isolado.
- `GET /api/health` retornou `status=ok` e versão `7.2.0`.
- Login `demo-token` retornou perfil `MEMBER`, sem privilégio administrativo.
- Helmet retornou CSP, `X-Content-Type-Options` e `X-Frame-Options`.
- Preview web entregou HTML, assets versionados e service worker `colo-v7-2-0`.

## Cobertura de regressão adicionada

- Bloqueio de modo demo em produção.
- Bloqueio de webhook sem assinatura fora de demo.
- Neutralização de fórmula em CSV/XLS.
- Segregação de dados pastorais, financeiros e históricos.
- Assinatura e expiração de webhook.
- Persistência, processamento, deduplicação e higienização de logs do job financeiro.
- Parser semântico da Lectio, preservando os quatro testes existentes.

## Limites da validação

- Firebase, Google Sheets e Mercado Pago reais não foram exercitados por ausência deliberada de credenciais.
- Docker e Flutter não estavam disponíveis no ambiente de validação; os arquivos foram revisados, mas as imagens e os binários mobile não foram compilados.
- As exceções transitivas da auditoria e seus controles compensatórios estão documentados em `SECURITY.md`.

Classificação final: **pronto para staging e piloto controlado**, condicionado à migração das abas, smoke tests com credenciais reais, backup e observabilidade descritos no runbook.
