# Auditoria de dependências — sprint de segurança 7.2.2

Data: 2026-08-25. Auditoria executada localmente com npm 11.19.0; projeto declara npm 10.9.0.

| Pacote/cadeia | Antes | Depois | Severidade | Runtime | Situação |
|---|---:|---:|---|---|---|
| `@nestjs/swagger -> js-yaml` | `11.4.6 -> 5.2.1` | `11.4.7 -> 5.3.0` | Alta | Sim, somente se Swagger for habilitado | CORRIGIDO por patch compatível |
| `firebase-admin` | `14.2.0` | `14.3.0` | Moderada agregada | Sim | ATUALIZADO no mesmo major; cadeia residual abaixo permanece |
| `firebase-admin -> @google-cloud/storage -> gaxios/uuid` | `7.21.0 -> uuid 9.0.1` | `7.22.0 -> uuid 9.0.1` | Moderada | Sim | ACEITO TEMPORARIAMENTE: audit indica `fixAvailable: false`; corrigir exigiria forçar majors transitivos não declarados pelo Firebase Admin |
| Tooling Nest/Angular/ESLint (`fast-uri`, `js-yaml 4`) | versões do lockfile | inalterado | Alta | Desenvolvimento/build | ACEITO TEMPORARIAMENTE: sem correção oferecida pelo audit; overrides experimentais foram rejeitados por produzirem árvore `invalid` e foram removidos |
| Vite/PostCSS/Nanoid | `vite 6.4.3`, `postcss 8.5.19`, `nanoid 3.3.16` | inalterado | Alta/moderada no audit completo | Build frontend | ACEITO TEMPORARIAMENTE: nenhuma correção compatível no major direto foi oferecida pelo audit |

Resultado de produção após a correção: 0 crítica, 0 alta, 9 moderadas. As 9 ocorrências representam a propagação da mesma cadeia `uuid <11.1.1` através de Storage/Google Auth; o uso afetado pelo advisory (geradores UUID v3/v5/v6 com buffer fornecido) não foi encontrado no código da aplicação, reduzindo a explorabilidade direta, mas não eliminando o risco de supply chain.

Nenhum `npm audit fix --force`, override de major ou atualização em massa foi aplicado.
