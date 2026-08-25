# Relatório de recuperação segura — 7.2.2

Data: 2026-08-25
Checkout legado (somente leitura): `I:\Projetos\colo-de-deus`
Clone oficial: `I:\Projetos\colo-de-deus-oficial`

## Preservação do checkout antigo

| Arquivo | SHA-256 | Tamanho | Última alteração |
|---|---|---:|---|
| `apps/api/src/missionaries/missionaries.module.ts` | `7D92E849F73E43DE92E9C9CCF47291ED78992CF78A0CF26347E24F8B6D175105` | 191 bytes | 2026-07-16T13:17:31.7400617-03:00 |
| `apps/api/src/missionaries/missionaries.controller.ts` | `143D03AC0AB27B15BD69D755A2E1C6C64A581CA5A2AB86B004338679A086082F` | 659 bytes | 2026-07-16T13:17:31.7511032-03:00 |
| `google-sheets-modelos/Missionarios.csv` | `91939160C8390A632E468D7DAB0858A8234C1EB75E47BDBB2045480061D89353` | 125 bytes | 2026-07-16T13:17:31.9134338-03:00 |

O diretório legado `apps/api/src/missionaries` contém somente os dois arquivos TypeScript acima. Nenhum arquivo foi copiado ou alterado.

## Clone e referência Git

- Remote fetch/push: `https://github.com/Talisson-Cleofas/colo-de-deus-app.git`
- Branch remota validada: `main`
- Branch local de trabalho: `recovery/7.2.2-consolidation`
- HEAD de `main`, `origin/main` e commit-base: `04960f65ffc7e28761e1e1fec2d1c54f59fbb1ca`
- Divergência base/HEAD: `0/0`
- Versão raiz/API/web: `7.2.2`
- Nenhum push, commit, deploy ou acesso a dados remotos foi realizado.

## Instalação e baseline

O projeto declara npm `10.9.0`, Node `>=22`, workspaces `apps/*` e `package-lock.json`. A instalação foi feita com `npm ci --ignore-scripts`, usando Node `26.7.0` e npm `11.19.0`; não houve upgrade nem audit fix.

| Verificação | Resultado | Erros/observações |
|---|---|---|
| Instalação | PASSOU | 764 pacotes; npm informou 11 vulnerabilidades de produção (2 altas, 9 moderadas). A contagem completa inclui 39 ocorrências (28 altas, 11 moderadas), muitas em ferramentas de desenvolvimento. |
| Lint | PASSOU | 0 erros, 16 avisos no frontend (hooks, `any`, fast refresh e expressão não usada). |
| Typecheck | PASSOU | API e web sem erros. |
| Build | PASSOU | API Nest e web Vite concluídos. Maior chunk: MUI, ~401,74 kB (~120,85 kB gzip). |
| Testes backend | PASSOU | 27/27 testes, 0 falhas. |
| Testes frontend | NÃO DISPONÍVEL | `@colo/web` não define script/suíte de testes. |
| Testes Flutter | NÃO EXECUTADO | Flutter não está instalado/disponível no PATH; `pubspec.yaml` está na versão 7.2.1+8. |

## Validação funcional

### Agenda Missionária

Existem criação, edição controlada por estado, envio para aprovação, aprovação, devolução com motivo, ministério responsável, responsável opcional, envio de membros, acompanhantes, intercessores, histórico e notificações individuais ligadas à entidade. Os testes cobrem o fluxo de aprovação, agenda sem missionário indicado, separação da equipe, devolução e bloqueios de perfil/ministério.

O estado `CONCLUIDA` existe no tipo e na visibilidade, mas **não existe endpoint, método, ação de interface ou teste para o missionário enviado confirmar a conclusão**. O fluxo termina em `ENVIADA_AOS_MEMBROS`.

### Administração e RBAC

`AdminModule` está registrado. Há dashboard administrativo reutilizado no dashboard principal para perfis administrativos e página de organização. O frontend usa `ProtectedRoute` e `PermissionRoute`; o backend aplica globalmente autenticação Firebase, roles, permissões, escopos ministeriais/módulos e liderança de célula. Endpoints administrativos sensíveis têm permissões/roles, mas a cobertura automatizada de matriz RBAC é insuficiente.

### Notificações

Há persistência de catálogo, leituras, preferências e entregas; destinatários individuais; audiências `TODOS`, `PERFIL`, `INDIVIDUAL`, `MINISTERIO`, `CELULA` e `CENACULO`; links e referências; e `/notifications/state`. Audiência individual é filtrada corretamente e testada. Gap: `CENACULO` retorna `true` para qualquer autenticado, sem comparar associação/ID.

### Soma+

Há persistência, contribuições, checkout, pagamentos, assinatura recorrente, webhook assinado com tolerância temporal e comparação constante, fila persistida/deduplicada, recuperação/retry, reconciliação, recibos, relatórios pessoais/administrativos e exportação. Saldo bruto/taxas/líquido usa `net_received_amount` do provedor como fonte preferencial. Testes cobrem isolamento, webhook, deduplicação, recorrência, reconciliação e valores. Nenhuma chamada ao Mercado Pago real foi feita.

### Lectio

Há fontes principal/fallback, sincronização, parser, retenção, logs, proteção de itens e controles administrativos. O backend possui teste dedicado do parser/state machine, mas a UI não possui suíte.

### PWA

Cache versionado `colo-v7-2-2`, instalação/ativação, `SKIP_WAITING`, limpeza de caches antigos, atualização em foco/visibilidade, fallback offline e não-cache de `/api`/Authorization estão implementados. Gap: a fila offline guarda ações em `localStorage` e as reenvia sem `Authorization`; não há teste E2E de login, expiração de sessão, reabertura, conflitos ou replay idempotente.

### Agenda Geral versus Agenda Missionária

Os domínios estão separados: `EventsModule`/`AgendaPage` cuidam de eventos e calendário institucional; `MissionaryAgendaModule`/`AgendaMissionariaPage` cuidam do workflow missionário. Não há reutilização do registro legado `Missionarios` na Agenda Geral.

## Módulo legado `missionaries`

Classificação: **D — contém dados/modelos que precisam ser migrados parcialmente; o código é legado descartável**.

- Controller: apenas `GET /missionaries`, sem DTO, filtros, paginação, regras próprias ou autorização específica; lê a aba `Missionarios` ou devolve duas fixtures. Não está registrado no `AppModule` legado e não existe na base oficial.
- Module: somente registra o controller; não oferece serviço/domínio reaproveitável.
- CSV/modelo: `id,nome,cidade,estado,ministerio,latitude,longitude,ativo`. Esses atributos já pertencem ao cadastro oficial `Membros` (nome, cidade, estado, ministério, latitude, longitude, ativo).
- Reaproveitar somente os dados reais que não existirem em `Membros`, após comparação por identificador e validação humana. Não copiar IDs fictícios nem o módulo/controller.
- O CSV preservado contém uma linha de exemplo; deve ser tratado como amostra, não importado automaticamente.

## Segurança — resumo

| Severidade | Achados confirmados |
|---|---:|
| Crítica | 0 |
| Alta | 1 |
| Média | 3 |
| Baixa | 2 |
| Informativa | 2 |

- Alta: audiência `CENACULO` sem escopo (`notification-read-engine.service.ts`). Confiança alta.
- Média: 11 ocorrências de vulnerabilidades em dependências de produção (2 altas/9 moderadas no relatório npm, concentradas em `js-yaml` via Swagger e cadeia Firebase/Google). Confiança alta; avaliar atualização compatível, sem `--force`.
- Média: fila offline reenvia mutações sem token e não define chave de idempotência/conflito. Confiança alta.
- Média: ausência de teste matricial sistemático de RBAC/BOLA nos controllers. Confiança média.
- Baixa: nomes de arquivos de relatório usam `Math.random`; previsível, embora não seja token de autenticação. Confiança alta.
- Baixa: Swagger anuncia versão 7.2.1 enquanto o projeto é 7.2.2. Confiança alta.
- Informativa: nenhuma credencial de alta confiança ou chave privada foi encontrada; exemplos `.env` são rastreados e arquivos reais estão ignorados.
- Informativa: o npm do ambiente difere do `packageManager`, reduzindo a fidelidade bit a bit.

Nenhum patch foi aplicado. Revisar cada correção antes de aplicar.

## Acessibilidade — auditoria estática WCAG 2.1 AA

A auditoria foi limitada ao código, sem navegador/NVDA. Há uso amplo de componentes MUI semânticos, labels e feedback de erro, porém diversos `IconButton` dependem apenas de `Tooltip` ou não têm nome acessível explícito (por exemplo navegação mensal, edição/exclusão e fechar diálogo). Isso é um gap de critério 4.1.2 e deve ser P1/P2 conforme a ação. Não há evidência automatizada de contraste, ordem de foco, teclado, zoom 200% ou alvos 44x44; exigir testes axe + teclado + leitor de tela antes de declarar conformidade.

## Mapa de gaps

| Área | Estado atual 7.2.2 | Gap | Prioridade | Correção necessária |
|---|---|---|---|---|
| Segurança | Guards globais, Helmet, CORS allowlist, throttle e validação | Dependências vulneráveis e cobertura BOLA incompleta | P0 | Triar advisories, atualizar de forma compatível e criar testes negativos de acesso |
| RBAC | Backend e frontend protegidos | Sem matriz automatizada completa por perfil/recurso/escopo | P0 | Testes de contrato para cada perfil e escopo |
| Notificações | Persistência, leitura, links e audiências | `CENACULO` acessível a todo autenticado | P0 | Resolver associação do membro ao cenáculo antes de entregar |
| Soma+ | Fluxo financeiro robusto e testado | Dependências de produção vulneráveis; validar operação real em sandbox | P0 | Atualizar dependências e executar homologação somente em sandbox autorizado |
| Agenda Missionária | Fluxo até envio está implementado | Não há conclusão pelo enviado | P1 | Endpoint/serviço/UI com autorização, idempotência, histórico e notificação |
| Agenda Geral | Eventos e calendário separados | Cobertura de regressão limitada | P1 | Testes de domínio e de não mistura com Agenda Missionária |
| Administração | Módulo/dashboard/páginas presentes | Cobertura RBAC e navegação administrativa incompleta | P1 | Testes de rotas, permissões e estados vazios/erro |
| PWA | Cache/update/offline básicos presentes | Replay sem auth/idempotência; reabertura não testada | P1 | Integrar token, política de conflito e E2E offline/reabertura |
| Testes | 27 backend passam | Nenhuma suíte frontend e Flutter indisponível | P1 | Vitest/RTL, E2E e pipeline Flutter |
| Acessibilidade | Base MUI e semântica parcial | Icon buttons sem nome; sem auditoria dinâmica | P1 | `aria-label`, axe, teclado, foco, contraste e leitor de tela |
| Lectio | Sync/fallback/retenção/logs | Cobertura UI/E2E ausente | P2 | Testes de falha de provedores e UI administrativa |
| Performance | Cache/métricas/chunks separados | Bundle MUI ~401,74 kB e hooks com dependências ausentes | P2 | Budget, análise de bundle e estabilização de hooks |
| Auditoria | Interceptor e repositório presentes | Verificar cobertura e mascaramento campo a campo | P2 | Testes de eventos sensíveis, retenção e redaction |
| UX/PWA | Fallback offline e atualização automática | Sem comunicação de conflito/replay ao usuário | P2 | Estado visível de fila, falha e resolução |
| Visual | Tema e componentes consistentes | Refinos após fluxos e a11y | P3 | Polimento visual sem alterar domínio |

## Próximo sprint recomendado

1. Corrigir o vazamento de audiência `CENACULO` e adicionar testes negativos de destinatário.
2. Criar matriz automatizada de RBAC/BOLA para endpoints administrativos, financeiros e missionários.
3. Triar/atualizar de modo compatível `js-yaml`/Swagger e a cadeia Firebase/Google; repetir `npm ci`, audit e baseline.
4. Projetar e implementar conclusão missionária idempotente: somente enviado elegível, registro de quem/quando, histórico, notificação e testes.
5. Tornar a fila offline autenticada e idempotente; testar logout, token expirado, reabertura e conflito.
6. Criar testes frontend para rotas/permissões e fluxos críticos; preparar Flutter em CI separado.
7. Corrigir nomes acessíveis e executar auditoria dinâmica WCAG 2.1 AA.
8. Migrar apenas dados legítimos do CSV/aba `Missionarios` para `Membros`, depois de inventário e aprovação explícita; descartar controller/module legado.
9. Tratar avisos de hooks e estabelecer budgets de performance.

Estado final: aguardando autorização; nenhum gap foi implementado.
