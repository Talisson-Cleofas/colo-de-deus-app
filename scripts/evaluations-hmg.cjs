// Permanent homologation entrypoint. Never imported by the production application.
// No Google/Firebase clients, external messages, payments, or durable data.
if (process.env.HOMOLOGATION_MODE !== 'true' || process.env.EVALUATIONS_QA !== 'true') {
  throw new Error('Homologation entrypoint disabled');
}
if (process.env.EXTERNAL_INTEGRATIONS_ENABLED !== 'false') {
  throw new Error('External integrations must remain disabled in homologation');
}
require('reflect-metadata');
const { NestFactory, Reflector } = require('@nestjs/core');
const { Module, ValidationPipe } = require('@nestjs/common');
const express = require('express');
const path = require('node:path');
const { EvaluationsController } = require('../apps/api/dist/evaluations/evaluations.controller');
const { EvaluationsService } = require('../apps/api/dist/evaluations/evaluations.service');
const { RolesGuard } = require('../apps/api/dist/auth/guards/roles.guard');
const { Permission } = require('../apps/api/dist/rbac/enums/permission.enum');
const members = ['DEVELOPER','MISSION_LEADER','MINISTRY_LEADER','MEMBER','CELL_LEADER'].map((profile,i)=>({id:`qa-${i}`,memberId:`qa-${i}`,uid:`qa-${i}`,name:`Teste ${profile}`,email:`qa-${i}@example.test`,profile,active:true,gifts:[],ministry:'',cell:'',photo:'',role:profile}));
const tabs = { AvaliacoesCiclos:[], AvaliacoesRespostas:[], 'Notificações':[], 'Ministérios':[{id:'music',nome:'Música de teste',lider_id:'qa-2',ativo:'TRUE'}], Participantes:[{tipo:'MINISTERIO',referencia_id:'music',membro_id:'qa-3',ativo:'TRUE'}] };
const sheets = { ensureTab:async()=>{}, listMembers:async()=>members, read:async tab=>tabs[tab]||[], parseActive:(v,d=false)=>v?v==='TRUE':d,
 appendRecord:async(tab,row)=>{if(tabs[tab].length>=250)throw new Error('Limite de teste atingido');tabs[tab].push({...row});},updateRecord:async(tab,key,id,row)=>{tabs[tab][tabs[tab].findIndex(r=>r[key]===id)]={...row};} };
const notifications={createSystem:async dto=>{tabs['Notificações'].push({...dto,id:`notice-${tabs['Notificações'].length}`,referencia_tipo:dto.referenceType,referencia_id:dto.referenceId,sentAt:new Date().toISOString(),senderName:'Sistema QA',read:false,active:true});}};
class QaModule {}
Module({controllers:[EvaluationsController],providers:[{provide:EvaluationsService,useValue:new EvaluationsService(sheets,notifications)}]})(QaModule);
(async()=>{
 const app=await NestFactory.create(QaModule);app.setGlobalPrefix('api');app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true}));app.useGlobalGuards(new RolesGuard(new Reflector()));
 const server=app.getHttpAdapter().getInstance();
 server.use((req,res,next)=>{res.setHeader('Cache-Control','no-store');req.user=members.find(m=>req.headers.cookie?.includes(`qa_profile=${m.id}`))||members[0];next();});
 server.get('/test',(_req,res)=>res.send('<h1>Ambiente permanente de homologação — somente dados fictícios</h1><p>Os dados são temporários e compartilhados neste ambiente. Nenhuma mensagem, cobrança ou alteração de produção sai daqui.</p>'+members.map(m=>`<p><a href="/test/profile/${m.id}">${m.profile}</a></p>`).join('')));
 server.get('/test/profile/:id',(req,res)=>{const user=members.find(m=>m.id===req.params.id);if(!user)return res.sendStatus(404);res.cookie('qa_profile',user.id,{httpOnly:true,sameSite:'lax'});res.send(`<script>localStorage.setItem('colo:user',${JSON.stringify(JSON.stringify(user))});location.replace('/avaliacoes');</script>`);});
 server.get('/api/auth/me',(req,res)=>res.json({user:req.user}));
 server.post('/api/auth/google',(req,res)=>res.json({user:req.user}));
 server.get('/api/rbac/me',(req,res)=>res.json({profile:req.user.profile,permissions:Object.values(Permission),scopes:{},ministryIds:[],cellIds:[]}));
 server.get('/api/notifications/state',(_req,res)=>res.json({notifications:tabs['Notificações'],unreadCount:tabs['Notificações'].length,total:tabs['Notificações'].length}));
 server.get('/api/notifications/options',(_req,res)=>res.json({members:[],ministries:[],cells:[],cenacles:[],profiles:[]}));
 server.get('/api/notifications/preferences',(_req,res)=>res.json({app:true}));
 server.get('/api/reports/options',(_req,res)=>res.json({members:[],ministries:[],cells:[],cenacles:[]}));
 server.get('/api/reports/history',(_req,res)=>res.json([]));
 server.get('/api/reports/advanced',(_req,res)=>res.json({indicators:{},comparison:{rateDifference:0},monthly:[],birthdays:[],ranking:[],lowFrequency:[],members:[],pagination:{page:1,totalPages:1}}));
 server.get('/api/health',(_req,res)=>res.json({status:'ok',environment:'homologation',storage:'memory',externalIntegrations:false,externalNotifications:false,payments:false,durableData:false}));
 server.use(express.static(path.join(__dirname,'../apps/web/dist'),{index:false}));
 server.use((req,res,next)=>req.method==='GET'&&!req.path.startsWith('/api/')?res.sendFile(path.join(__dirname,'../apps/web/dist/index.html')):next());
 await app.init();
 await app.listen(Number(process.env.PORT||4180),'0.0.0.0');
})();
