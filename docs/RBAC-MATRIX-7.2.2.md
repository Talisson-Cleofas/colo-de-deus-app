# Matriz RBAC/BOLA — baseline do sprint 7.2.2

Esta matriz documenta a política local antes das correções de domínio. Permissão de rota nunca substitui escopo do registro.

| Recurso | ADMIN / líder de missão | Líder de ministério | Líder de célula | Membro | Regra de objeto |
|---|---|---|---|---|---|
| Membros | leitura/gestão funcional | leitura/atualização no ministério | leitura/atualização na célula | perfil público/próprio | finanças e histórico: somente próprio ou administração central |
| Células | total funcional | ministério próprio | células lideradas | leitura | mutações exigem `canEdit` do registro |
| Cenáculos | total funcional | ministério próprio | célula vinculada | leitura | detalhe/mutação exigem escopo; audiência exige participação/liderança explícita |
| Agenda Geral | total funcional | escopo ministerial | escopo de célula | leitura | registros permanecem no domínio Eventos |
| Agenda Missionária | revisão total funcional | seleção no ministério | criação/liderança quando responsável | somente designado/visível | `findOne` deriva de lista escopada; transições revalidam capacidade |
| Administração | settings read/manage | negado | negado | negado | backend protegido por permissão |
| Soma+ | gestão/relatórios | operações concedidas no escopo | leitura/escrita concedida | próprio | pagamentos e recibos validam `member_id` |
| Notificações | criação funcional, sem visão automática de audiências restritas | criação do escopo | criação do escopo | leitura das próprias audiências | state/read usam audiência persistida; IDs/payload não ampliam acesso |
| Auditoria | leitura | negado | negado | negado | endpoint protegido por `LOGS:READ`/settings |
| RBAC | settings manage | negado | negado | negado | alterações protegidas no backend |
| Lectio | leitura e gestão | leitura | leitura | leitura | mutações usam role administrativa |

Observações:

- `ADMIN` é normalizado para a política funcional `MISSION_LEADER`; não recebe administração técnica de `DEVELOPER`.
- Líder da Agenda, líder de ministério, líder de cenáculo e missionário enviado são capacidades de objeto, não novos roles globais.
- A suíte `rbac-bola-matrix.test.cjs` valida permissões padrão e cenários BOLA de perfil, notificação, Agenda Missionária e recibo financeiro.
