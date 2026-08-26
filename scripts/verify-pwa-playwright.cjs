const fs = require('node:fs');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ serviceWorkers: 'allow' });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  await page.addInitScript(() => localStorage.setItem('colo:user', JSON.stringify({
    uid:'pwa-user',id:'pwa-user',memberId:'pwa-user',name:'Usuário PWA',email:'pwa@example.test',profile:'MEMBER',active:true,
  })));
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const body = path === '/auth/me' ? { user:{uid:'pwa-user',id:'pwa-user',memberId:'pwa-user',name:'Usuário PWA',email:'pwa@example.test',profile:'MEMBER',active:true} }
      : path === '/rbac/me' ? {profile:'MEMBER',permissions:['DASHBOARD:READ'],scopes:{},ministryModules:[]}
      : path === '/notifications/state' ? {notifications:[],items:[],unreadCount:0,readCount:0,total:0,updatedAt:new Date().toISOString()}
      : {cards:[],indicators:[],upcomingEvents:[],lectio:null};
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.locator('main').waitFor();
  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready;
    return { scope: ready.scope, controlled: Boolean(navigator.serviceWorker.controller) };
  });
  if (!registration.controlled) {
    await page.reload();
    await page.locator('main').waitFor();
  }
  const controlledAfterReopen = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
  const cacheContents = await page.evaluate(async () => Object.fromEntries(await Promise.all((await caches.keys()).map(async (key) => [key, (await (await caches.open(key)).keys()).map((request) => request.url)]))));
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(13_000);
  const offlineReopen = await page.locator('main').isVisible();
  const offlineDiagnostics = offlineReopen ? null : await page.evaluate(() => ({
    url: location.href, hasSnapshot: Boolean(localStorage.getItem('colo:user')), text: document.body.innerText.slice(0, 300),
  }));
  await context.setOffline(false);

  const source = fs.readFileSync('apps/web/public/sw.js', 'utf8');
  const policy = {
    versionedCache: /colo-v7-2-5/.test(source),
    explicitSkipWaiting: /type === 'SKIP_WAITING'/.test(source),
    noForcedInstallActivation: !/install[\s\S]{0,180}skipWaiting\(\)/.test(source),
    oldCacheCleanup: /caches\.delete/.test(source),
  };
  await browser.close();
  const result = { firstInstallation: 'PASS', controlledAfterReopen, offlineReopen, offlineDiagnostics, cacheContents, policy };
  console.log(JSON.stringify(result));
  if (!controlledAfterReopen || !offlineReopen || Object.values(policy).some((value) => !value)) process.exitCode = 1;
})().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
