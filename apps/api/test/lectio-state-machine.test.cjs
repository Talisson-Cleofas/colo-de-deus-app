const test = require('node:test');
const assert = require('node:assert/strict');
const { SemanticStateMachineParser } = require('../dist/lectio/semantic-state-machine.parser');
const { SemanticLectioParser } = require('../dist/lectio/semantic-lectio.parser');
const { CnbbLectioProvider } = require('../dist/lectio/cnbb-lectio.provider');

const parser = new SemanticStateMachineParser();

const cnbbLike = `
<html><body>
<div>Primeira Leitura</div><div>Mq 7,14-15.18-20</div><div>Salmo</div><div>Sl 84(85)</div><div>Evangelho</div><div>Mt 12,46-50</div>
<h2>Primeira Leitura (Mq 7,14-15.18-20)</h2>
<p>Leitura da Profecia de Miqueias.</p>
<p>14 Apascenta o teu povo com o cajado da autoridade.</p><p>15 Faze-nos ver novos prodígios.</p><p>18 Qual Deus existe, como tu?</p><p>Palavra do Senhor.</p>
<h2>Salmo Responsorial (Sl 84(85),2-4.5-6.7-8 (R. 8a))</h2>
<p>R. Mostrai-nos, ó Senhor, vossa bondade.</p>
<p>Favorecestes, ó Senhor, a vossa terra.</p><p>R. Mostrai-nos, ó Senhor, vossa bondade.</p>
<p>Renovai-nos, nosso Deus e Salvador.</p>
<h2>Aclamação ao Evangelho</h2><p>Aleluia, Aleluia, Aleluia.</p><p>Quem me ama guardará minha palavra.</p>
<h2>Evangelho (Mt 12,46-50)</h2>
<p>Proclamação do Evangelho de Jesus Cristo segundo Mateus.</p>
<p>Naquele tempo, Jesus estava falando às multidões.</p><p>Quem é minha mãe e quem são meus irmãos?</p><p>Palavra da Salvação.</p>
<footer>Conferência Nacional dos Bispos do Brasil © Todos os direitos reservados</footer>
</body></html>`;

test('separa blocos e ignora sumário e rodapé', () => {
  const result = parser.parse(cnbbLike, '2026-07-20', 'CNBB');
  assert.equal(result.firstReadingReference, 'Mq 7,14-15.18-20');
  assert.match(result.firstReadingText, /Apascenta/);
  assert.doesNotMatch(result.firstReadingText, /Salmo|Evangelho/);
  assert.match(result.psalmResponse, /Mostrai-nos/);
  assert.doesNotMatch(result.psalmText, /Mostrai-nos/);
  assert.equal(result.secondReadingText, '');
  assert.match(result.acclamationText, /Aleluia/);
  assert.equal(result.gospelReference, 'Mt 12,46-50');
  assert.match(result.gospelTitle, /Proclamação/);
  assert.match(result.gospelText, /Naquele tempo/);
  assert.doesNotMatch(result.gospelText, /Miqueias|Apascenta|direitos reservados/);
});

const cancaoNovaLike = cnbbLike
  .replace('Conferência Nacional dos Bispos do Brasil © Todos os direitos reservados', 'Ajude a Canção Nova Pedido de Oração Aplicativo Liturgia Diária')
  .replace('Primeira Leitura (Mq 7,14-15.18-20)', '1ª Leitura (Mq 7,14-15.18-20)');

test('aceita variação de títulos da Canção Nova', () => {
  const result = parser.parse(cancaoNovaLike, '2026-07-20', 'CANCAO_NOVA');
  assert.match(result.firstReadingText, /Apascenta/);
  assert.match(result.gospelText, /Naquele tempo/);
  assert.doesNotMatch(result.gospelText, /Ajude a Canção Nova/);
});

test('não interpreta a palavra evangelho dentro da leitura como cabeçalho', () => {
  const html = `<main>
    <h2>Primeira Leitura (1Cor 9,16-19.22b-27)</h2>
    <p>Leitura da Primeira Carta de São Paulo aos Coríntios.</p>
    <p>Pregar o evangelho é uma necessidade. O evangelho foi confiado a mim e, por causa do evangelho, faço tudo para servir aos irmãos.</p>
    <p>Assim continuo a anunciar a boa-nova com fidelidade e perseverança diante de todos.</p>
    <p>Palavra do Senhor.</p>
    <h2>Responsório Sl 83(84),3.4.5-6.12 (R. 2)</h2>
    <p>R. Quão amável, ó Senhor, é vossa casa!</p>
    <p>Minha alma desfalece de saudades e anseia pelos átrios do Senhor.</p>
    <p>R. Quão amável, ó Senhor, é vossa casa!</p>
    <h2>Evangelho (Lc 6,39-42)</h2>
    <p>Proclamação do Evangelho de Jesus Cristo segundo Lucas.</p>
    <p>Naquele tempo, Jesus contou uma parábola aos discípulos sobre o caminho e a verdade.</p>
    <p>Palavra da Salvação.</p>
  </main>`;
  const result = parser.parse(html, '2026-09-11', 'CANCAO_NOVA');
  assert.match(result.firstReadingText, /Pregar o evangelho/);
  assert.match(result.firstReadingText, /por causa do evangelho/);
  assert.match(result.psalmText, /Minha alma/);
  assert.match(result.gospelText, /Naquele tempo/);
  assert.doesNotMatch(result.gospelText, /Pregar o evangelho/);
});

test('aceita títulos e referências na mesma linha sem parênteses', () => {
  const html = `<main>
    <div>1ª Leitura Mq 7,14-15.18-20 Leitura da Profecia de Miquéias. Apascenta o teu povo com o cajado da autoridade, o rebanho de tua propriedade. Palavra do Senhor.</div>
    <div>Responsório Sl 84(85),2-4.5-6.7-8 R. Mostrai-nos, ó Senhor, vossa bondade. Renovai-nos, nosso Deus e Salvador, concedei-nos também vossa salvação.</div>
    <div>Evangelho Mt 12,46-50 Proclamação do Evangelho de Jesus Cristo segundo Mateus. Naquele tempo, enquanto Jesus estava falando às multidões, sua mãe e seus irmãos ficaram do lado de fora. Palavra da Salvação.</div>
  </main>`;
  const result = parser.parse(html, '2026-07-21', 'CANCAO_NOVA');
  assert.match(result.firstReadingReference, /Mq 7/);
  assert.match(result.psalmReference, /Sl 84/);
  assert.match(result.gospelReference, /Mt 12/);
  assert.ok(result.firstReadingText.length >= 40);
  assert.ok(result.gospelText.length >= 40);
});


test('ignora o menu real da Canção Nova antes dos blocos litúrgicos', () => {
  const html = `<html><body>
    <ul>
      <li><a>1ª Leitura Jr 2,1-3.7-8.12-13</a></li>
      <li><a>Salmo Sl 35(36),6-7ab.8-9.10-11 (R. 10a)</a></li>
      <li><a>Evangelho Mt 13,10-17</a></li>
    </ul>
    <h2>Primeira Leitura (Jr 2,1-3.7-8.12-13)</h2>
    <p>Leitura do Livro do Profeta Jeremias.</p>
    <p>1 A palavra do Senhor foi-me dirigida, dizendo: 2 Vai e grita aos ouvidos de Jerusalém. Lembro-me de ti, da afeição da jovem e do amor da noiva.</p>
    <p>7 Eu vos introduzi numa terra de pomares, para que gozásseis de seus melhores produtos.</p>
    <p>13 Dois pecados cometeu meu povo: abandonou-me a mim, fonte de água viva.</p>
    <p>Palavra do Senhor.</p>
    <h2>Responsório Sl 35(36),6-7ab.8-9.10-11 (R. 10a)</h2>
    <p>R. Em vós está a fonte da vida, ó Senhor!</p>
    <p>Vosso amor chega aos céus, ó Senhor, chega às nuvens a vossa verdade.</p>
    <p>Quão preciosa é, Senhor, vossa graça! Os filhos dos homens se abrigam sob vossas asas.</p>
    <h2>Evangelho (Mt 13,10-17)</h2>
    <p>Aleluia, Aleluia, Aleluia.</p>
    <p>Proclamação do Evangelho de Jesus Cristo segundo Mateus.</p>
    <p>Naquele tempo, os discípulos aproximaram-se e disseram a Jesus: Por que tu falas ao povo em parábolas?</p>
    <p>Jesus respondeu que a eles foi dado o conhecimento dos mistérios do Reino dos Céus.</p>
    <p>Palavra da Salvação.</p>
    <footer>Conferência Nacional dos Bispos do Brasil</footer>
  </body></html>`;
  const result = parser.parse(html, '2026-07-23', 'CANCAO_NOVA');
  assert.match(result.firstReadingText, /A palavra do Senhor/);
  assert.ok(result.firstReadingText.length > 100);
  assert.match(result.psalmResponse, /fonte da vida/);
  assert.match(result.gospelText, /Naquele tempo/);
  assert.doesNotMatch(result.firstReadingText, /^Jr 2/);
});

test('consulta a API oficial da CNBB com origem e referer exigidos', async () => {
  const previousFetch = global.fetch;
  let request;
  global.fetch = async (url, options) => {
    request = { url: String(url), options };
    return {
      ok: true,
      json: async () => ({ content: { details: '', body: cnbbLike } }),
    };
  };
  try {
    const config = { get: (_key, fallback) => fallback };
    const provider = new CnbbLectioProvider(config, new SemanticLectioParser(parser));
    const result = await provider.fetchWithMetadata('2026-09-11', true);
    assert.match(request.url, /contents\/in\/date\/2026-09-11$/);
    assert.equal(request.options.headers.origin, 'https://liturgiadiaria.edicoescnbb.com.br');
    assert.equal(request.options.headers.referer, 'https://liturgiadiaria.edicoescnbb.com.br/');
    assert.match(result.value.firstReadingText, /Apascenta/);
  } finally {
    global.fetch = previousFetch;
  }
});
