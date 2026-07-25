# Sprint 3.4 — Configurações Gerais

## Funcionalidades

- Nome da missão e da comunidade.
- Logo principal, logo branca e imagem de capa por URL/caminho interno.
- Cor principal e secundária com seletor e pré-visualização.
- Cidade, estado, e-mail, telefone, site e Instagram.
- Ativação de aniversários, privacidade da idade e antecedência dos lembretes.
- Limite de ausências e ativação de justificativas.
- Confirmação obrigatória, abrangência, duração e lembrete padrão dos eventos.
- Acesso administrativo protegido no frontend e backend.
- Registro da última atualização e auditoria na aba Histórico.

## Aba Configurações

Cabeçalho para copiar e colar:

```text
chave	valor	descricao	atualizado_em
```

A API cria automaticamente os registros de configuração ao realizar o primeiro salvamento.

## Endpoints

- `GET /api/settings/public` — identidade e contato para uso geral do aplicativo.
- `GET /api/settings` — configurações completas, somente ADMIN.
- `PATCH /api/settings` — atualização, somente ADMIN.

## Validação

- Typecheck NestJS: aprovado.
- Typecheck React: aprovado.
- Build NestJS: aprovado.
- Build React/Vite: aprovado.
