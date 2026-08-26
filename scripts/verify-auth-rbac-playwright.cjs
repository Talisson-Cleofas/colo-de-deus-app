const { chromium } = require('playwright');

const user = { uid:'member-a',id:'member-a',memberId:'member-a',name:'Membro A',email:'a@example.test',profile:'MEMBER',active:true,photo:'' };
const permissions = ['DASHBOARD:READ','MISSIONARY_AGENDA:READ','NOTIFICATIONS:READ'];

async function mockApi(page) {
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const body = path === '/auth/google' || path === '/auth/me' ? { user }
      : path === '/rbac/me' ? { profile:'MEMBER',permissions,scopes:{},ministryModules:[] }
      : path === '/notifications/state' || path === '/notifications' ? {
        notifications:[{id:'allowed',title:'Aviso permitido',message:'A',type:'INFO',audience:'CENACULO',audienceId:'a',origin:'Sistema',referenceType:'',referenceId:'',link:'',senderId:'',senderName:'Sistema',sentAt:new Date().toISOString(),read:false,readAt:null,active:true,canDelete:false}],
        items:[],unreadCount:1,readCount:0,total:1,updatedAt:new Date().toISOString(),
      } : path === '/notifications/preferences' ? {} : [];
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
  });
}

(async () => {
  const browser = await chromium.launch({ headless:true });
  const context = await browser.newContext({ serviceWorkers:'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(12_000);
  await mockApi(page);
  await page.goto('http://127.0.0.1:4173/login');
  await page.getByRole('button', { name:'Entrar no modo demonstração' }).click();
  await page.locator('main').waitFor();
  const memberMenu = {
    home: await page.getByText('Início', { exact:true }).count() > 0,
    adminHidden: await page.getByText('Administração técnica', { exact:true }).count() === 0,
  };
  await page.goto('http://127.0.0.1:4173/configuracoes');
  await page.waitForURL('**/sem-permissao');
  const directUrlBlocked = page.url().endsWith('/sem-permissao');
  await page.goto('http://127.0.0.1:4173/notificacoes');
  await page.getByText('Aviso permitido').waitFor();
  const unauthorizedAbsent = await page.getByText('Aviso de outro cenáculo').count() === 0;
  await page.getByText('Sair', { exact:true }).click();
  await page.waitForURL('**/login');
  const loggedOut = await page.evaluate(() => !localStorage.getItem('colo:user'));
  await page.reload();
  const reopenRequiresLogin = page.url().endsWith('/login');
  await browser.close();
  const result = { login:'PASS', memberMenu, directUrlBlocked, unauthorizedAbsent, loggedOut, reopenRequiresLogin };
  console.log(JSON.stringify(result));
  if (!memberMenu.home || !memberMenu.adminHidden || !directUrlBlocked || !unauthorizedAbsent || !loggedOut || !reopenRequiresLogin) process.exitCode=1;
})().catch((error)=>{console.error(error.stack||error.message);process.exitCode=1;});
