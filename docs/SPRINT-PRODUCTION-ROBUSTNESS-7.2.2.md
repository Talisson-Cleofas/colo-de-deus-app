# Sprint de robustez de produção — 7.2.2

Data final: 2026-08-26
Branch: `recovery/7.2.2-consolidation`
Checkpoint inicial: `194ff266bafb41e0616ac3273bcf8a22a0d968e1`

## E2E HTTP

A suíte `http-rbac-bola.e2e.test.cjs` cria uma aplicação Nest real em memória, com os controllers e guards compilados da aplicação. Firebase, Google Sheets e Mercado Pago são substituídos por doubles isolados. Foram validados autenticação, Membros, Cenáculos, Notificações, Agenda Missionária, Soma+ e Administração em nível HTTP.

## Idempotência da conclusão missionária

A Agenda Missionária passou a persistir `conclusao_operacao_id`. Após gravar a transição, cada instância relê a linha e somente a proprietária da reivindicação produz histórico, auditoria e notificações. A chave pode vir de `Idempotency-Key` e o request/correlation ID permanece separado.

Limitação: Google Sheets não oferece compare-and-swap nem transação condicional. A releitura reduz a janela de corrida e o teste com duas instâncias compartilhando persistência produz um único conjunto de efeitos, mas não constitui garantia matemática sob todas as intercalações possíveis. Garantia forte exige migrar essa operação para persistência transacional ou um coordenador distribuído.

## PWA e fila offline

- cache `colo-v7-2-5`, limpeza de versões anteriores e ativação somente após consentimento;
- evento de atualização, `SKIP_WAITING`, `controllerchange` e guarda contra reload infinito;
- manifesto Vite para pré-cache dos chunks hashados e lazy;
- reabertura offline validada em Chromium;
- fila vinculada ao proprietário, sem token persistido;
- token renovado no replay e envio de `Idempotency-Key`;
- retry com backoff, limite e retenção explícita de conflitos;
- ação de A nunca é reproduzida como B; logout descarta operações do usuário que encerra a sessão;
- filas antigas sem proprietário são descartadas por segurança.

## Acessibilidade automatizada

| Página | Antes | Depois |
| --- | ---: | ---: |
| Início | 1 | 0 |
| Lectio | 1 | 0 |
| Agenda Geral | 2 | 0 |
| Agenda Missionária | 1 | 0 |
| Eventos | 0 | 0 |
| Soma+ | 1 | 0 |
| Células | 1 | 0 |
| Cenáculos | 1 | 0 |
| Ministérios | 1 | 0 |
| Membros | 1 | 0 |
| Notificações | 2 | 0 |
| Perfil | 2 | 0 |
| Administração | 2 | 0 |
| Auditoria | 1 | 0 |
| RBAC | 1 | 0 |

Foram corrigidos estrutura de listas, nomes de botões e progressos, associação de labels, landmarks, skip link, título por rota e anúncio acessível da atualização PWA. Axe não substitui validação manual com NVDA, zoom, alto contraste e teclado em hardware real.

## Flutter

O projeto existe em `mobile/`, versão `7.2.1+8`, SDK Dart `>=3.5.0 <4.0.0`. Não há executáveis `flutter` ou `dart` no `PATH` nem nos caminhos locais usuais inspecionados. Por isso `flutter doctor`, `pub get`, `analyze`, testes e build não puderam ser executados. A revisão estática também mostrou que `ApiClient` ainda não envia token Firebase, deixando o app incompatível com endpoints autenticados atuais; a correção deve ser feita somente em ambiente com SDK disponível e testes executáveis.

## Baseline final

- lint: aprovado, 0 erros e 16 avisos conhecidos;
- typecheck: aprovado;
- builds API/web: aprovados;
- backend: 48/48;
- frontend: 14/14;
- E2E HTTP: 7/7 áreas;
- Playwright: Agenda Missionária e auth/RBAC/notificações/logout aprovados;
- Axe: 15/15 rotas sem violações WCAG automatizadas;
- PWA: instalação, controle, reabertura e offline aprovados;
- audit de produção: 0 críticas, 0 altas, 6 moderadas transitivas.

Nenhum commit, push, deploy ou alteração remota foi executado neste sprint.

## Arquitetura de perfis e RBAC

Os identificadores internos exatos encontrados no enum `ProfileCode` são `DEVELOPER`,
`MISSION_LEADER`, `MINISTRY_LEADER`, `CELL_LEADER` e `MEMBER`.

| Item | Tipo | Identificador atual |
| --- | --- | --- |
| DEVELOPER | Perfil global | `DEVELOPER` |
| Líder de missão | Perfil global | `MISSION_LEADER` |
| Líder de ministério | Perfil global | `MINISTRY_LEADER` |
| Membro | Perfil global | `MEMBER` |
| Líder da Agenda Missionária | Função/permissão contextual | vínculo/autorização no registro |
| Missionário enviado | Vínculo contextual | participante persistido na agenda |
| Líder de célula | Função contextual desejada | atualmente também existe o perfil global `CELL_LEADER` |
| Responsável por cenáculo | Vínculo/função contextual | `responsavel_id`/`vice_responsavel_id` do cenáculo |

`ADMIN` ainda é aceito como alias legado e normalizado para a política funcional de
`MISSION_LEADER`; não é membro do enum `ProfileCode`. O perfil global adicional
`CELL_LEADER` já existe no código e nos defaults. Ele não foi alterado automaticamente
neste sprint e deve ser objeto de revisão arquitetural específica. Liderança da Agenda
Missionária, missionário enviado, participante de missão e responsabilidade por cenáculo
permanecem contextuais e não criam novos perfis globais.

## Idempotência distribuída

- `Idempotency-Key` recebido no endpoint é usado como identificador da operação;
- `conclusao_operacao_id` persiste a reivindicação de conclusão no registro;
- após a escrita, a linha é relida e somente a instância cuja operação permaneceu
  persistida produz histórico, auditoria e notificações;
- revalidação de estado/autorização e deduplicação impedem efeitos duplicados nas
  intercalações cobertas pelos testes, inclusive duas instâncias compartilhando a mesma
  persistência;
- Google Sheets não oferece compare-and-swap nem transação condicional, portanto não há
  garantia forte para todas as intercalações distribuídas possíveis.

Classificação: **RISCO CONHECIDO — RELEVANTE APENAS PARA CONCORRÊNCIA DISTRIBUÍDA FORTE**.

Não existe `render.yaml`/Blueprint versionado nem configuração local de autoscaling ou
múltiplas instâncias. A documentação versionada descreve um único serviço de API e não
declara escala horizontal. Considerando somente a configuração local autorizada para esta
revisão, a migração transacional não bloqueia a homologação. Antes de produção, deve-se
confirmar no ambiente remoto que a API permanece com uma instância; autoscaling ou mais de
uma instância deve ser tratado como bloqueador até a migração transacional. Nenhum acesso ao
Render foi realizado.

## Plano do próximo sprint — Flutter/mobile

1. Ambiente: instalar e configurar o Flutter SDK somente após aprovação; validar `PATH`,
   executar `flutter doctor`, localizar Android SDK, conferir Java/JDK e inventariar
   dispositivo físico ou emulador.
2. Dependências: executar `flutter pub get`, registrar incompatibilidades e manter as
   versões atuais salvo quando uma mudança for estritamente necessária.
3. Autenticação: adaptar `ApiClient` para consultar o usuário Firebase atual, obter ou
   renovar o ID token por requisição, enviar `Authorization: Bearer <token>`, tratar
   401/403 e expiração e nunca persistir o token manualmente.
4. Compatibilidade: alinhar de forma deliberada a versão mobile `7.2.1+8` com o release
   corrente e validar os contratos dos endpoints autenticados antes de alterar fluxos.
5. Fluxos: validar login, logout, perfil, Agenda Geral, Agenda Missionária, notificações,
   Lectio, endpoints protegidos e reabertura do aplicativo.
6. Qualidade: executar `flutter analyze`, `flutter test`, build Android e build web/mobile
   quando aplicável, registrando ambiente, dispositivo e artefatos produzidos.

Flutter e Dart não estão disponíveis no ambiente atual; nada foi instalado ou implementado
neste sprint.

## Checklist para homologação isolada

Executar a matriz para `DEVELOPER`, `MISSION_LEADER`, `MINISTRY_LEADER`, `MEMBER`, líder
contextual da Agenda Missionária e missionário enviado:

- [ ] login válido, usuário ausente/inativo e logout;
- [ ] RBAC, menus visíveis/ocultos e acesso direto por URL;
- [ ] Agenda Geral: consulta e ações permitidas por perfil/escopo;
- [ ] Agenda Missionária: criação, aprovação, indicação/envio, conclusão e histórico;
- [ ] conclusão autorizada pelo missionário enviado e bloqueada para terceiro por BOLA;
- [ ] notificações por audiência, leitura e tentativa BOLA por ID;
- [ ] Soma+ sem pagamento real, com isolamento de contribuição e recibo;
- [ ] Lectio e respectivos estados/autorização;
- [ ] instalação/atualização PWA, reabertura online/offline, conflitos e replay da fila;
- [ ] isolamento da fila entre usuários, renovação do token e descarte no logout;
- [ ] reabertura após logout exigindo autenticação;
- [ ] registrar evidências por perfil, rota, resultado esperado e resultado observado.

Não houve homologação remota nesta etapa.
