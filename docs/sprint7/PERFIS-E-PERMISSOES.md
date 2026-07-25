# Perfis e permissões

A hierarquia é:

`ADMIN > LEADER > MEMBER`

- **ADMIN**: acesso administrativo completo.
- **LEADER**: funções de liderança, presença e relatórios.
- **MEMBER**: módulos comuns do aplicativo.

O backend usa guards globais. Todos os endpoints são protegidos por padrão, exceto os marcados com `@Public()`, como `/api/health` e `/api/auth/google`.

A chamada de presença e os relatórios exigem no mínimo o perfil `LEADER`. O frontend também protege a rota de presença e mostra uma tela de acesso restrito quando necessário.
