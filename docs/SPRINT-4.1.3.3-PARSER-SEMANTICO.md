# Sprint 4.1.3.3 — Parser Semântico da Liturgia

O `SemanticLectioParser` centraliza a interpretação do HTML recebido da CNBB e da Canção Nova.

## Fluxo
Provider → HTML → normalização → delimitação semântica → validação estrutural → Lectio → Google Sheets.

## Garantias
- Primeira Leitura, Salmo, Segunda Leitura opcional, Aclamação e Evangelho são blocos independentes.
- Primeira Leitura, Salmo e Evangelho são obrigatórios.
- Rodapés institucionais, botões e chamadas de compartilhamento são descartados.
- Uma fonte inválida gera erro isolado e o `LectioProviderManager` continua para o fallback.
- O conteúdo salvo anteriormente é preservado se todas as fontes falharem.

## Homologação
Após atualizar, execute uma sincronização forçada para ignorar o cache antigo. Registros manuais, revisados ou protegidos continuam preservados e não são sobrescritos automaticamente.
