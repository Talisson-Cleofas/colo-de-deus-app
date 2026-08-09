import { execFileSync } from 'node:child_process';

const reviewedAdvisories = new Map([
  [
    'https://github.com/advisories/GHSA-mh99-v99m-4gvg',
    'brace-expansion é transitivo de utilitários internos do Google; a aplicação não aceita padrões glob do usuário.',
  ],
  [
    'https://github.com/advisories/GHSA-pm4m-ph32-ghv5',
    'js-yaml é transitivo do Swagger e não processa YAML fornecido por usuários; Swagger fica desativado em produção.',
  ],
  [
    'https://github.com/advisories/GHSA-qwww-vcr4-c8h2',
    'o frontend usa BrowserRouter como SPA e não habilita React Server Components nem server actions.',
  ],
]);

let output;
try {
  output = execFileSync('npm', ['audit', '--omit=dev', '--json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (error) {
  output = error.stdout;
  if (!output) throw error;
}

const report = JSON.parse(output);
const blocked = [];
const accepted = [];

for (const vulnerability of Object.values(report.vulnerabilities ?? {})) {
  for (const advisory of vulnerability.via ?? []) {
    if (typeof advisory === 'string' || !['high', 'critical'].includes(advisory.severity)) continue;
    const reason = reviewedAdvisories.get(advisory.url);
    if (reason) accepted.push({ name: advisory.name, url: advisory.url, reason });
    else blocked.push({ name: advisory.name, severity: advisory.severity, url: advisory.url });
  }
}

const unique = (items) => [...new Map(items.map((item) => [item.url, item])).values()];
for (const item of unique(accepted)) {
  console.log(`Exceção revisada: ${item.name} — ${item.reason}`);
}

if (blocked.length) {
  for (const item of unique(blocked)) {
    console.error(`Vulnerabilidade ${item.severity} não revisada: ${item.name} — ${item.url}`);
  }
  process.exitCode = 1;
} else {
  const totals = report.metadata?.vulnerabilities ?? {};
  console.log(
    `Auditoria aprovada: ${totals.critical ?? 0} crítica(s), ${totals.high ?? 0} alta(s) na árvore e nenhuma alta fora das exceções revisadas.`,
  );
}
