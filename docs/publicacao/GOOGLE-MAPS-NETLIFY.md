# Google Maps no Netlify

## 1. Variável do frontend

No Netlify, em **Site configuration → Environment variables**, mantenha:

```env
VITE_GOOGLE_MAPS_ENABLED=true
VITE_GOOGLE_MAPS_API_KEY=SUA_CHAVE_PUBLICA_WEB
```

Depois da alteração, faça **Deploys → Trigger deploy → Clear cache and deploy site**.

## 2. Autorizar o domínio

No Google Cloud:

1. Acesse **APIs e serviços → Credenciais**.
2. Abra a chave usada no frontend.
3. Em **Restrições do aplicativo**, escolha **Sites** ou **Referenciadores HTTP**.
4. Adicione:

```text
https://colo-de-deus-missao-brasilia.netlify.app/*
http://localhost:5173/*
http://127.0.0.1:5173/*
```

Não cadastre somente `/membros`. O sufixo `/*` libera todas as rotas do SPA.

## 3. Restringir as APIs

Na mesma chave, escolha **Restringir chave** e habilite:

- Maps JavaScript API;
- Places API, se o frontend usar autocomplete.

Não habilite Geocoding API nessa chave pública quando a geocodificação for executada pelo backend.

## 4. Chave do backend

No Render, use outra chave:

```env
GOOGLE_MAPS_ENABLED=true
GOOGLE_MAPS_SERVER_API_KEY=SUA_CHAVE_PRIVADA_DO_SERVIDOR
```

Essa chave deve permitir a **Geocoding API** e, preferencialmente, ser restrita aos IPs do servidor quando a infraestrutura permitir.

## 5. Erros comuns

### RefererNotAllowedMapError

O domínio atual não foi adicionado às restrições da chave pública.

### ApiNotActivatedMapError

A Maps JavaScript API ainda não foi habilitada no projeto Google Cloud.

### BillingNotEnabledMapError

O faturamento do projeto Google Cloud não está ativo.

### InvalidKeyMapError

A chave informada está inválida, foi removida ou pertence a outro projeto.
