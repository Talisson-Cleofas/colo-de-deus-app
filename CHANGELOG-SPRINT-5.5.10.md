# Sprint 5.5.10 — Google Maps Produção e Diagnóstico

## Objetivo

Estabilizar o carregamento do mapa de membros em produção e tornar erros de autorização da chave do Google Maps compreensíveis para o administrador.

## Alterações

- carregamento da Maps JavaScript API com `loading=async` e callback explícito;
- uso de `auth_referrer_policy=origin` para validar apenas a origem autorizada;
- tratamento de `gm_authFailure` para detectar falhas de chave/referenciador;
- mensagem administrativa indicando exatamente qual origem deve ser autorizada;
- link direto para as credenciais do Google Cloud quando o mapa falhar;
- prevenção de carregamento duplicado do script do Google Maps;
- correção do overlay de carregamento para Material UI 7 usando propriedades CSS em `sx`;
- manutenção do mapa e da lista simplificada sem derrubar a página de membros;
- documentação completa das restrições de domínio e API.

## Configuração obrigatória fora do código

Na chave usada em `VITE_GOOGLE_MAPS_API_KEY`, configure em **Google Cloud → APIs e serviços → Credenciais → Restrições do aplicativo → Sites**:

```text
https://colo-de-deus-missao-brasilia.netlify.app/*
http://localhost:5173/*
http://127.0.0.1:5173/*
```

Se usar deploy previews do Netlify, adicione também o domínio exato de cada preview necessário.

Em **Restrições de API**, permita pelo menos:

- Maps JavaScript API;
- Places API, somente quando autocomplete/pesquisa de locais estiver ativo.

A chave do backend (`GOOGLE_MAPS_SERVER_API_KEY`) deve ser separada e permitir a Geocoding API.
