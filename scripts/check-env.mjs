import { readFile } from 'node:fs/promises';

async function parse(path) {
  const text = await readFile(path, 'utf8');
  return Object.fromEntries(text.split(/\r?\n/).filter(l => l && !l.trim().startsWith('#') && l.includes('=')).map(l => {
    const i=l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim()];
  }));
}
const api=await parse('apps/api/.env');
const web=await parse('apps/web/.env');
const demo=api.DEMO_MODE !== 'false' && web.VITE_DEMO_MODE !== 'false';
if (!demo) {
  const requiredApi=['FIREBASE_PROJECT_ID','FIREBASE_CLIENT_EMAIL','FIREBASE_PRIVATE_KEY','GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','GOOGLE_SHEETS_ID'];
  const requiredWeb=['VITE_FIREBASE_API_KEY','VITE_FIREBASE_AUTH_DOMAIN','VITE_FIREBASE_PROJECT_ID','VITE_FIREBASE_APP_ID'];
  const missing=[...requiredApi.filter(k=>!api[k]),...requiredWeb.filter(k=>!web[k])];
  if (missing.length) { console.error('Variáveis ausentes:', missing.join(', ')); process.exit(1); }
}
console.log(`Ambiente válido (${demo ? 'demo' : 'real'}).`);
