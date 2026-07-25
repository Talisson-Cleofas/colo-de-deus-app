# Sprint 3.1 — Notificações Automáticas e Preferências

## Entregas
- preferências individuais por categoria e horário;
- notificações automáticas de aniversário no dia e três dias antes;
- processamento automático horário e execução manual administrativa;
- estrutura de eventos de sistema para eventos, confirmações, justificativas, vínculos e lideranças;
- registro de entregas, tentativas e falhas;
- canal APP funcional e campos preparados para Firebase Push;
- duas novas abas: NotificacoesPreferencias e NotificacoesEntregas.

## Endpoints
- GET/PATCH `/notifications/preferences`
- GET `/notifications/deliveries` (ADMIN)
- POST `/notifications/automations/process` (ADMIN)

## Observação Firebase
O campo `firebase_token` e o canal PUSH já estão modelados. Para envio real, configure o Firebase Admin no backend e grave o token do dispositivo no perfil de preferência.
