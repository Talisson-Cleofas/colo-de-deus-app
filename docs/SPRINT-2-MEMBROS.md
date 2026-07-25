# Sprint 2 — Área de Membros

## Aba Membros no Google Sheets

A linha 1 deve conter exatamente estas colunas:

`id | nome | email | foto | funcao | ministerio | celula | telefone | perfil | ativo | bio | instagram | data_nascimento | data_entrada | cidade | estado | dons`

- `foto`: URL pública HTTPS. Pode apontar para uma imagem publicada no Google Drive, Firebase Storage ou outro CDN.
- `perfil`: `ADMIN` ou `MEMBER`.
- `ativo`: `Sim`, `true`, `1` ou `ativo` libera o perfil.
- `dons`: valores separados por vírgula.
- datas: padrão `AAAA-MM-DD`.

A conta de serviço configurada no backend precisa ter acesso de leitura à planilha.

## Endpoints

- `GET /api/members`
- `GET /api/members?q=talisson&ministry=Coordenação&cell=Célula%20Ágape`
- `GET /api/members/facets`
- `GET /api/members/ministries`
- `GET /api/members/:id`

## Fotos

Quando a URL não existe ou não é informada, a interface mostra um avatar com as iniciais do membro. Por privacidade, use apenas fotos autorizadas pelos membros.
