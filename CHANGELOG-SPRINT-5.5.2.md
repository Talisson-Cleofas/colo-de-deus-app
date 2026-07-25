# Sprint 5.5.2 — Restauração das configurações do Soma+

## Correções

- Restaurada a chave PIX configurada nas versões anteriores.
- Restaurados banco, agência, conta e CNPJ do Mercado Pago.
- Restaurado o link de assinatura recorrente do Mercado Pago.
- Restaurado o QR Code PIX em `/assets/mercado-pago-pix-qr.png`.
- Adicionados fallbacks por variáveis de ambiente para evitar nova perda de configuração.
- Mantida a prioridade da aba `Financeiro`: dados salvos no Google Sheets continuam sobrescrevendo os valores padrão.
- Versão atualizada para `5.5.2`.

## Ordem de carregamento

1. Dados da aba `Financeiro` no Google Sheets.
2. Variáveis `SOMA_*` do ambiente.
3. Configurações restauradas da versão anterior.
