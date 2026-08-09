# Sprint 7.2 — Estabilização, Segurança e Produção

## Segurança

- Modo demonstração desativado por padrão e proibido em produção.
- Validação de ambiente fail-fast para Firebase, Google Sheets, HTTPS e Mercado Pago.
- Rate limiting global e limites mais restritos para login, recibos públicos e webhooks.
- Perfis de membros agora separam dados públicos, pastorais, financeiros e histórico.
- Líderes de ministério não recebem acesso implícito aos dados financeiros de terceiros.
- Exportações CSV/XLS neutralizam células iniciadas por `=`, `+`, `-` ou `@`.
- Logs de webhook deixam de armazenar assinatura, cabeçalhos, IP ou payload completo.

## Confiabilidade

- `npm ci` restaurado com lockfile coerente.
- Dependências vulneráveis ou incompatíveis atualizadas e overrides de segurança aplicados.
- Contribuições Soma+ persistidas na planilha e vinculadas ao usuário autenticado.
- Webhooks Mercado Pago possuem assinatura com janela temporal, idempotência, fila persistente, retries limitados e recuperação após reinício.
- Histórico de pagamentos deixa de duplicar eventos sem mudança de estado.
- Shutdown hooks, proxy confiável configurável e Swagger desativado por padrão em produção.

## Entrega

- CI executa ambiente, lint, tipos, testes, build e auditoria de dependências.
- Imagens Docker usam instalação reproduzível; a API executa sem usuário root e sem dependências de desenvolvimento.
- Nginx entrega cabeçalhos defensivos e impede cache do service worker.
- Versões do monorepo, API, web, PWA e protótipo mobile alinhadas em 7.2.0.

## Fora do escopo

- Migração de Google Sheets para um banco transacional.
- Homologação e publicação dos aplicativos Flutter nas lojas.
- Implantação em produção, alteração de DNS ou cadastro de credenciais reais.
