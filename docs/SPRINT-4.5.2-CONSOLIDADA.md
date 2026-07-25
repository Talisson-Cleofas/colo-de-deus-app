# Sprint 4.5.2 — Estrutura Organizacional (consolidada)

## Hierarquia

- Entidade e aba `Missao`.
- Relação `Missao -> Ministérios` por `missao_id`.
- Campos `missao_id` e `ministerio_id` nos cadastros organizacionais previstos.
- Novos registros de Eventos, Células e Cenáculos recebem automaticamente `missao-brasilia`.
- Registros antigos das abas `Usuarios`, `Eventos`, `Células` e `Cenáculos` recebem `missao_id` automaticamente no seed quando o campo estiver vazio.

## Seed inicial

Cria de forma idempotente a **Missão Brasília** e os ministérios Música, Missões, Eventos, Finanças, Células, Cenáculo, Comunicação e Intercessão.

## Frontend

- Tela Missões em `/missoes`.
- Tela Ministérios em `/ministerios`, com vínculo à missão.

## RBAC

Mantém as correções do perfil `DEVELOPER`, incluindo a tipagem completa no backend.
