# Sprint 3.9.2 — Sincronização de Perfil e Vínculos

## Correções

- Perfil pessoal passa a combinar os vínculos ativos da aba `Participantes` com as responsabilidades oficiais registradas em `Ministérios`, `Células` e `Cenáculos`.
- Lideranças e vice-lideranças sempre prevalecem sobre funções antigas da aba `Participantes`.
- Trocas de liderança desativam automaticamente o vínculo de liderança anterior e ativam o novo vínculo.
- O resumo de ministério e célula da aba `Membros` é recalculado após alterações estruturais.
- O perfil usa leitura atualizada da aba `Membros`, evitando cache antigo após alterações administrativas.
- Datas de nascimento são gravadas e devolvidas no formato `YYYY-MM-DD`.
- O campo `formador` é lido e gravado exclusivamente pela aba `Membros`, tanto na Área de Membros quanto no Perfil Pessoal.
- A sincronização técnica manual também reconcilia todos os vínculos estruturais.

## Transação lógica

Como o Google Sheets não oferece transações relacionais, a sincronização usa compensação: se uma etapa falhar, os registros de participantes já alterados são restaurados ou desativados para evitar vínculos parciais.
