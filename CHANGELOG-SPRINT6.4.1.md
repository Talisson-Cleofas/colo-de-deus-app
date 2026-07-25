# Sprint 6.4.1 — Logo unificada

- Criado o arquivo mestre `assets/brand/logo-oficial-branca.png`.
- React passou a usar `import.meta.env.BASE_URL`, funcionando também em publicação sob subdiretórios.
- PWA e tela offline usam a mesma identidade oficial.
- Flutter usa `assets/images/logo-oficial-branca.png`.
- Ícones Android e iPhone permanecem derivados da mesma arte branca oficial.
- Removidos arquivos antigos de logo para impedir referências quebradas.
- Adicionado `npm run brand:sync` para sincronizar o arquivo mestre com React e Flutter.
- Cache da PWA atualizado para `colo-de-deus-v6.4.1`.
