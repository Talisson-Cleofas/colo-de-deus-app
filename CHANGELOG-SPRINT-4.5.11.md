# Sprint 4.5.11 — Correção de Perfis e Permissões

## Correções

- Corrigida a leitura das abas `Perfis`, `Permissoes` e `PerfisPermissoes` quando a planilha possui cabeçalhos antigos em inglês.
- Compatibilidade adicionada para cabeçalhos em português e inglês, incluindo `codigo/code`, `nome/name`, `descricao/description`, `nivel/level` e `ativo/active`.
- Os perfis agora exibem corretamente nome, código, nível, status e descrição.
- O seletor da Matriz de Acesso agora exibe o nome do perfil e o respectivo nível.
- As permissões voltam a mostrar código, recurso, ação e descrição.
- Adicionados valores padrão seguros para os cinco perfis oficiais quando algum campo legado estiver vazio.
- Registros inválidos ou totalmente vazios deixam de ser exibidos no catálogo RBAC.

## Perfis padrão reconhecidos

- Desenvolvedor — Nível 100
- Líder Missão — Nível 90
- Líder de Ministério — Nível 60
- Líder de Célula — Nível 40
- Membro — Nível 10
