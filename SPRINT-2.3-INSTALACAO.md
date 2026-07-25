# Instalação — Sprint 2.3 Área Administrativa

1. Extraia o arquivo ZIP.
2. Mantenha seus arquivos `.env` atuais em `apps/api` e `apps/web`.
3. No terminal, na raiz do projeto, execute:

```bash
npm install
npm run dev
```

A API continuará em `http://localhost:4000` e o frontend em `http://localhost:5173`, conforme a configuração atual do projeto.

Ao entrar com um membro cujo perfil na planilha seja `ADMIN`, a página inicial exibirá automaticamente a nova Área Administrativa. Perfis `LEADER` e `MEMBER` continuam vendo o dashboard comum.

## Abas usadas pelo painel

- Membros
- Ministérios
- Comunidades
- Eventos
- Presenças
- Soma
- Notificações

Os nomes e intervalos podem ser personalizados pelas variáveis descritas em `CHANGELOG-SPRINT2.3.md`.
