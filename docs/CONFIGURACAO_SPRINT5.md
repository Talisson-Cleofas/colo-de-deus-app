# Configuração da Sprint 5

## PIX
Preencha no `apps/api/.env`:

```env
PIX_KEY=sua-chave
PIX_KEY_TYPE=E-mail
PIX_BENEFICIARY=Nome do favorecido
SOMA_MONTHLY_GOAL=50000
```

## Google Drive
1. Crie uma pasta no Google Drive.
2. Compartilhe a pasta com o e-mail da conta de serviço.
3. Copie o ID da pasta para `GOOGLE_DRIVE_FOLDER_ID`.
4. Ative a Google Drive API no mesmo projeto Google Cloud.

A conta de serviço precisa de acesso à pasta. O backend usa o escopo `drive.file`.

## Google Sheets
Importe `google-sheets-modelos/Soma.csv` na aba `Soma` e compartilhe a planilha com a conta de serviço.
