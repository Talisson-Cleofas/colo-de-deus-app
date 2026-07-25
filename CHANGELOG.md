# Sprint 4.3.2

- Corrigida criação e sincronização automática de abas no Google Sheets.
- Colunas ausentes passam a ser adicionadas sem alterar dados existentes.
- Escritas respeitam a ordem real dos cabeçalhos.
- Sincronização retorna relatório detalhado e isola alertas de vínculos.


## Sprint 3.7 — Histórico e Administração de Perfil
- Histórico completo por membro.
- Perfil público interno e visão administrativa.
- Gestão de acesso, ativação, vínculos, lideranças e formador.
- Auditoria e autorização no backend.
# Changelog

## Sprint 3.4 — Configurações Gerais

- Nova página administrativa de configurações gerais.
- Identidade institucional: missão, comunidade, logos, capa e cores.
- Localização e contatos institucionais.
- Regras do módulo de aniversários.
- Limite de ausências e ativação de justificativas.
- Regras padrão de eventos.
- Persistência na aba Configurações do Google Sheets.
- Histórico de alterações administrativas.
- Endpoints protegidos para ADMIN e leitura pública das informações visuais.
- Typecheck e builds do frontend e backend validados.

## 2.0.0 — Sprint 2

- Área de membros completa.
- Busca instantânea e filtros.
- Cards responsivos com fotos e fallback.
- Perfil individual detalhado.
- Diretório de ministérios.
- API de membros ampliada.
- Modelo Google Sheets atualizado para A:Q.

## 6.3.0 — Notificações sincronizadas

- Sino da tela inicial abre a central de notificações.
- Contador usa a quantidade real de notificações não lidas.
- Badge desaparece automaticamente quando todas forem lidas.
- Leitura, exclusão e marcação em massa refletem imediatamente no dashboard.
- Persistência mantida no `localStorage`.
- Atalho Mapa da tela inicial leva para a aba de mapa dentro de Células.

## 2.8.0 — Gestão de Cenáculos
- Cadastro de responsáveis, participantes, localização e recorrência.
- Presença de cenáculos integrada ao Google Sheets.
- Permissões de edição para responsáveis e lideranças autorizadas.

## 3.0.0 — Central de Notificações
- Central completa de notificações com públicos segmentados.
- Contador no sino, leitura individual/coletiva, filtros, paginação e exclusão lógica.
- Persistência em Google Sheets e regras de permissão no backend.

## 3.1.0 — Notificações automáticas e preferências
- Preferências por categoria, horário e canal.
- Automação de aniversários no dia e três dias antes.
- Registro de entregas, tentativas e falhas.
- Estrutura preparada para Firebase Push.

## 3.2.0 — Relatórios Operacionais

- painel de indicadores operacionais;
- relatórios de membros e vínculos;
- presenças, faltas e justificativas;
- filtros, busca e paginação;
- escopo por perfil aplicado no backend.

## 3.3.0
- Relatórios avançados, comparativos, ranking, aniversários, baixa frequência e exportações.
- Histórico de relatórios gerados no Google Sheets.

## 3.5.0 — Integrações e Administração Técnica
- Painel administrativo de integrações e testes de conexão.
- Sincronização e validação do Google Sheets.
- Histórico de erros técnicos.
- Configurações técnicas de notificações.
- Administração de permissões.
- Proteção e mascaramento total de credenciais.

## Sprint 3.6 — Perfil Pessoal
- Perfil pessoal conectado ao Google Sheets.
- Edição segura de foto por URL, telefone, nascimento, cidade, estado, biografia, Instagram e dons.
- Validação de campos no frontend e backend.
- Visualização de ministérios, célula, cenáculos, líder responsável e formador.
- Preferências pessoais de notificações integradas à Sprint 3.1.
- Função, e-mail, perfil e vínculos protegidos contra alteração pelo próprio membro.

## 3.9.0 — Lembretes e Mensagens de Aniversário

- Automação configurável para aniversários do dia e lembretes antecipados.
- Mensagens padrão e personalizadas integradas à Central de Notificações.
- Histórico de mensagens e entregas.
- Cartões de aniversários da semana e do mês no dashboard.
- Configuração de público: todos ou somente líderes.

## 3.9.2 — Sincronização entre perfil e estruturas

- Corrigida divergência entre liderança exibida nos módulos e vínculos do Perfil Pessoal.
- Adicionada reconciliação automática entre Membros, Participantes, Ministérios, Células e Cenáculos.
- Trocas de liderança removem vínculos antigos e ativam os novos.
- Perfil passa a refletir alterações imediatamente, sem depender do cache de membros.
- Data de nascimento normalizada definitivamente para `YYYY-MM-DD`.
- Campo Formador unificado entre Área de Membros e Perfil.

## 3.9.3 — Acompanhamento do perfil

- Não exibe o próprio membro como líder responsável de si mesmo.
- Mostra os líderes dos outros ministérios em que o membro participa.
- Mantém o formador visível no bloco Acompanhamento.
- Remove duplicações na lista de líderes exibidos.

## 3.9.4 — Cenáculos por Data e Histórico

- Cenáculos agora possuem início e fim obrigatórios.
- Listagem automática por Próximos, Encerrados e Cancelados.
- Filtro por período, duplicação, encerramento antecipado e reabertura.
- Histórico, presenças, participantes e relatórios preservados.

## 4.1.1 — Lectio Base + Retenção

- Nova estrutura completa de dados da Lectio.
- Cadastro e edição manual no painel.
- Configuração de CNBB e Canção Nova como fontes futuras.
- Retenção de 1 a 30 dias, padrão de 7 dias.
- Proteção de conteúdos manuais e revisados.
- Aba LectioSincronizacoes e histórico de limpeza.
- Novas rotas administrativas de configuração e retenção.

## 4.1.1A — Arquitetura de Integrações
- Nova estrutura `Lectio`, `Integracoes`, `HistoricoIntegracoes` e `ConfiguracoesSistema`.
- Serviço centralizado `IntegrationConfigService`.
- Nova tela administrativa de Integrações.
- Retenção da Lectio migrada para histórico genérico de integrações.
- Documentação e guia de migração incluídos.

## 4.1.2 — Provider CNBB
- Integração real com a página pública de Liturgia Diária da CNBB.
- Parser HTML e normalização das leituras, salmo, Evangelho e antífonas.
- Detecção de alterações e preservação de registros manuais/revisados/protegidos.
- Histórico técnico centralizado em `HistoricoIntegracoes`.
- Botão de sincronização, progresso, status e última execução no frontend.

## 4.1.3 — Canção Nova + Fallback
- Novo `CancaoNovaLectioProvider`.
- Orquestração por prioridade CNBB/Canção Nova.
- Fallback automático, timeout e cache por provider.
- Preservação do último conteúdo quando as duas fontes falham.
- Tela administrativa com status e prioridade das fontes.
- Logs detalhados em `HistoricoIntegracoes`.

## 4.1.3.1 — Correções dos providers da Lectio

- Adicionado `LectioProviderManager`.
- Corrigido fallback CNBB → Canção Nova.
- Parsers revisados com estratégias por seções HTML e regex.
- Logs individuais por provider em `HistoricoIntegracoes`.
- Interface passa a exibir tentativas, erro por fonte e uso do fallback.
- Leitura das novas abas mantida e tratada separadamente no painel.

## 4.1.3.2 — Leituras Estruturadas
- Primeira Leitura, Salmo, Segunda Leitura e Evangelho separados.
- Títulos e referências independentes.
- Segunda Leitura opcional.
- Migração automática da aba Lectio.
- Validação obrigatória de Primeira Leitura, Salmo e Evangelho.

## 4.1.3.3 — Parser Semântico da Liturgia
- Novo `SemanticLectioParser` compartilhado pelos providers CNBB e Canção Nova.
- Separação semântica de Primeira Leitura, Salmo, Segunda Leitura, Aclamação e Evangelho.
- Remoção de scripts, estilos, HTML, entidades e rodapés institucionais.
- Validação estrutural antes de gravar no Google Sheets.
- Compatibilidade com fallback pelo `LectioProviderManager`.

## 4.1.3.4 — State Machine Parser

- Parser semântico substituído por máquina de estados linha a linha.
- Corrigido vazamento de Primeira Leitura no Evangelho e de marcadores no texto das leituras.
- Sumários de navegação anteriores ao conteúdo completo agora são ignorados.
- Salmo separado em referência, refrão e estrofes.
- Remoção reforçada de rodapés e cabeçalhos repetidos.
- Testes de regressão adicionados para CNBB e Canção Nova.

## 4.1.3.5 — Dashboard Dinâmico da Área de Membros
- Dashboard integrado à Lectio, Notificações, Membros e Eventos reais.
- Removidos conteúdos demonstrativos do card da Lectio e dos próximos eventos.
- Adicionado endpoint agregado com isolamento de erros por seção.

## 4.1.3.6 — Estabilização das Notificações

- Corrigido `Invalid time value` na Central de Notificações.
- Adicionada normalização única de datas no backend e frontend.
- Registros sem data ou com data inválida não derrubam mais a página.
- Ordenação e filtro de notificações agora são seguros.

## 4.1.3.8 — Motor de Leitura de Notificações

- Adicionado `NotificationReadEngine`.
- Criado `GET /notifications/state` como fonte única de verdade.
- Relação entre `Notificações` e `NotificacoesLeituras` por membro.
- Ausência de leitura passa a significar notificação não lida.
- Escrita compatível com `data_leitura` e legado `lida_em`.
- Store global `useNotificationState()` compartilhado entre Sidebar, sino e Central.
- Badge oculto quando o contador é zero ou a sincronização está indisponível.

## Sprint 4.3.3 — Correção definitiva de cotas do Google Sheets

- Leitura de metadados em uma chamada.
- Leitura de todos os cabeçalhos com `values.batchGet`.
- Criação de abas com `spreadsheets.batchUpdate`.
- Escrita de cabeçalhos com `values.batchUpdate`.
- Cache estrutural configurável.
- Retry com exponential backoff e jitter para 429 e erros transitórios 5xx.
- Bloqueio de sincronizações estruturais simultâneas.

## Sprint 4.3.4 — Mapa e uploads pelo dispositivo
- Nova rota `/mapa` no menu lateral, reunindo Eventos, Células e Cenáculos.
- Mapa incorporado na página de detalhes do evento e botão para abrir rota no Google Maps.
- Upload de imagens diretamente da galeria, câmera ou armazenamento do celular/computador.
- Pré-visualização local da imagem antes do envio.
- Progresso visual e bloqueio contra envio duplicado.
- Upload vinculado ao evento, célula ou cenáculo e persistido no Google Drive/Sheets.
