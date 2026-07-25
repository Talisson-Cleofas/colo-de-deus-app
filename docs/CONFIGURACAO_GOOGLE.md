# Configuração do Google e Firebase

1. Crie um projeto no Firebase Console.
2. Em Authentication > Sign-in method, habilite Google.
3. Crie um app Web e copie as variáveis para `apps/web/.env`.
4. Em Configurações do projeto > Contas de serviço, gere uma chave privada.
5. Copie `project_id`, `client_email` e `private_key` para `apps/api/.env`.
6. Crie uma planilha e importe `google-sheets-modelos/Membros.csv` para uma aba chamada `Membros`.
7. Compartilhe a planilha como Leitor com o e-mail da conta de serviço (`FIREBASE_CLIENT_EMAIL`).
8. Copie o ID da planilha para `GOOGLE_SHEETS_ID`.
9. Troque `DEMO_MODE=false` no backend e `VITE_DEMO_MODE=false` no frontend.
10. Reinicie `npm run dev`.

O login real usa `signInWithPopup` no frontend, envia o ID Token ao NestJS e o backend valida o token com Firebase Admin antes de conferir o e-mail na planilha.
