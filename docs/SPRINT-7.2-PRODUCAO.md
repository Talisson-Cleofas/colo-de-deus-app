# Runbook de produção — Sprint 7.2

## Prontidão

Esta entrega está pronta para piloto controlado e pré-produção. O backend ainda usa Google Sheets como armazenamento principal; por isso, pagamentos, permissões e restauração precisam ser homologados com a planilha real antes de liberar o uso amplo.

## 1. Preparação

1. Faça uma cópia integral da planilha e confirme o histórico de versões no Google Drive.
2. Gere um ambiente de staging separado de produção, com outra planilha e outro app Firebase.
3. Copie `apps/api/.env.example` e `apps/web/.env.example` para o cofre de configuração do provedor.
4. Preencha os valores reais sem commitar arquivos `.env` ou credenciais JSON.
5. Configure `NODE_ENV=production`, `DEMO_MODE=false`, `VITE_DEMO_MODE=false`, `TRUST_PROXY=true` e `SWAGGER_ENABLED=false`.
6. Use URLs HTTPS em `WEB_URL`, `PUBLIC_API_URL`, `FRONTEND_URL` e `VITE_API_URL`.

## 2. Verificação antes do deploy

```bash
npm ci
npm run check:env:examples
npm run lint
npm run typecheck
npm test
npm run build
npm run audit:production
```

Em staging, execute também `npm run check:env` com os arquivos de ambiente montados.

O relatório bruto do npm ainda contém exceções transitivas sem correção compatível. Elas são limitadas por contexto, documentadas em `SECURITY.md` e devem ser revistas até 31/08/2026; qualquer advisory alto novo faz o gate falhar.

## 3. Migração segura das planilhas

1. Publique primeiro a API em staging.
2. Autentique-se com perfil que possua `SETTINGS_MANAGE`.
3. Consulte `GET /api/admin/sheets/schema`.
4. Execute uma vez `POST /api/admin/sheets/initialize`.
5. Confirme a criação de `WebhookJobs` e das colunas `membro_nome`, `email` e `competencia` na aba `Soma`.
6. Repita a consulta de schema e não prossiga se houver cabeçalhos inválidos.

O inicializador adiciona estrutura; não deve apagar registros. Mesmo assim, mantenha a cópia da planilha até o fim da homologação.

## 4. Smoke tests

- `GET /api/health` retorna `status=ok` e versão `7.2.0`.
- Login Google aceita apenas um e-mail ativo na aba `Membros`.
- Um membro visualiza o próprio financeiro, mas não o de outra pessoa.
- Um líder visualiza os dados pastorais apenas do seu escopo e não visualiza finanças ou histórico de terceiros.
- Uma contribuição manual aparece novamente após reiniciar a API.
- Um webhook assinado é aceito com HTTP 202 e conclui como `PROCESSED` em `WebhookJobs`.
- O reenvio do mesmo webhook não duplica pagamento nem histórico.
- Uma assinatura antiga ou inválida retorna 401.
- CSV e XLS com nomes iniciados por caracteres de fórmula abrem como texto.

## 5. Observabilidade

- Monitore disponibilidade e latência de `/api/health`.
- Crie alertas para respostas 5xx, picos de 401/429 e reinícios do processo.
- Revise `WebhookJobs` para estados `RETRY` ou `DEAD` e `WebhookLogs` para erros operacionais.
- Monitore quotas e falhas de API do Google Sheets e Mercado Pago.
- Não copie tokens, assinaturas ou dados pessoais completos para logs externos.

## 6. Promoção e rollback

1. Promova a mesma imagem validada em staging, sem rebuild.
2. Libere para um grupo piloto e acompanhe ao menos um ciclo real de pagamento.
3. Se houver regressão, reverta a imagem para a versão anterior e restaure a cópia da planilha apenas se a migração ou os dados tiverem sido corrompidos.
4. Não exclua `WebhookJobs`: jobs pendentes permitem recuperação após a volta da API.

## Pendências para maturidade plena

- Migrar operações financeiras e fila de jobs para banco transacional.
- Adicionar backup automatizado com teste periódico de restauração.
- Integrar erros e métricas a uma plataforma central de observabilidade.
- Homologar o protótipo Flutter separadamente para Android e iOS.
