# Política de segurança

Relate vulnerabilidades de forma privada ao responsável técnico do projeto. Não inclua tokens, credenciais, dados de membros ou payloads financeiros no relato.

## Dependências

O gate `npm run audit:production` falha para qualquer advisory crítico ou alto não revisado. Em 31/07/2026 existem três exceções temporárias, todas sem correção compatível publicada:

| Pacote            | Advisory            | Aplicabilidade                                                                                   |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------ |
| `brace-expansion` | GHSA-mh99-v99m-4gvg | Transitivo de ferramentas internas dos clientes Google; nenhum padrão glob é aceito de usuários. |
| `js-yaml`         | GHSA-pm4m-ph32-ghv5 | Transitivo do Swagger; a aplicação não recebe YAML e o Swagger fica desativado em produção.      |
| `react-router`    | GHSA-qwww-vcr4-c8h2 | Afeta React Server Components/server actions; este frontend é uma SPA com `BrowserRouter`.       |

As exceções devem ser revistas até 31/08/2026 ou assim que houver versão corrigida. A vulnerabilidade moderada transitiva de `uuid@9` não é usada com buffer fornecido pela aplicação e também deve ser removida quando o SDK Firebase atualizar sua árvore.

Não force versões principais incompatíveis por override apenas para silenciar o scanner. Overrides atuais permanecem dentro das linhas semânticas exigidas pelos dependentes.
