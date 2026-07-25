# Identidade visual oficial

O único arquivo mestre da logo é:

```text
assets/brand/logo-oficial-branca.png
```

Para atualizar a logo no futuro, substitua apenas esse arquivo e execute:

```bash
npm run brand:sync
```

O comando envia a mesma imagem para:

- React/PWA: `apps/web/public/brand/logo-oficial-branca.png`
- Flutter Android/iPhone: `mobile/assets/images/logo-oficial-branca.png`

Os favicons, ícones PWA, Android e AppIcon do iOS são derivados da mesma arte oficial e não devem ser usados como fonte principal.
