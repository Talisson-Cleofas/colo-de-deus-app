# Instalação limpa — Sprint 7.1

## Windows PowerShell

```powershell
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
npm cache verify
npm install
npm run check:env
npm run validate
npm run dev
```

## URLs locais

- Web: http://localhost:5173
- API: http://localhost:4000/api
- Saúde da API: http://localhost:4000/api/health
- Swagger: http://localhost:4000/docs

## Modo demonstrativo

Mantenha `DEMO_MODE=true` e `VITE_DEMO_MODE=true` para iniciar sem Firebase e sem Google Sheets.

## Modo real

Altere ambos para `false`, preencha os arquivos `.env` e compartilhe a planilha com `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
