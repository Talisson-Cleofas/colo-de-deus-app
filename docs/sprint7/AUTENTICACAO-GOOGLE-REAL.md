# Autenticação Google real

## 1. Firebase Authentication

1. Crie ou abra o projeto no Firebase Console.
2. Acesse **Authentication > Sign-in method** e habilite **Google**.
3. Em **Configurações do projeto > Seus apps**, registre o aplicativo Web.
4. Copie as variáveis do SDK Web para `apps/web/.env`.
5. Adicione `localhost` e o domínio de produção em **Authorized domains**.

## 2. Firebase Admin no NestJS

1. Acesse **Configurações do projeto > Contas de serviço**.
2. Gere uma chave privada.
3. Copie `project_id`, `client_email` e `private_key` para `apps/api/.env`.
4. Não envie a chave privada ao GitHub.

## 3. Google Sheets

1. Crie a aba `Membros` usando `google-sheets-modelos/Membros.csv`.
2. Compartilhe a planilha como **Leitor** com `FIREBASE_CLIENT_EMAIL`.
3. Informe o ID em `GOOGLE_SHEETS_ID`.
4. Cada usuário precisa ter e-mail idêntico ao da conta Google, estar com `ativo=Sim` e possuir um perfil:
   - `ADMIN`
   - `LIDER` ou `LEADER`
   - `MEMBER`

## 4. Ativação

Backend:

```env
DEMO_MODE=false
```

Frontend:

```env
VITE_DEMO_MODE=false
```

Reinicie frontend e backend. O frontend abre o seletor de contas Google, o NestJS valida o ID Token com Firebase Admin e consulta o e-mail na planilha antes de liberar a sessão.
