import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const db=process.env.DATABASE_URL||"";
const site="http://127.0.0.1:3115";
if(process.env.CI_MONGO_ISOLATED!=="1" ||
 !/^mongodb:\/\/127\.0\.0\.1:27017\/yedi_ci_[a-z0-9_]+\?/.test(db) ||
 process.env.NEXTAUTH_URL!==site)throw Error("REFUSED: real browser tests require isolated 127.0.0.1 MongoDB");
const prisma=new PrismaClient();
const nonce=randomBytes(5).toString("hex");
const existingPixel="synthetic-meta-"+nonce;
const secret="synthetic-secret-never-expose-"+nonce;
let browser,admin,reader,manager,donor,dbId;
const people=[];
async function waitServer(){for(let i=0;i<90;i++){try{if((await fetch(site+"/api/tracking/config")).ok)return}catch{}await new Promise(r=>setTimeout(r,1000))}throw Error("Next server unavailable")}
async function auth(user){
 const token=await encode({
  token:{sub:user.id,email:user.email,name:user.name,role:user.role,dashboardPermissions:user.dashboardPermissions},
  secret:process.env.NEXTAUTH_SECRET,maxAge:3600,
 });
 return "next-auth.session-token="+encodeURIComponent(token);
}
async function request(path,method="GET",session=null,payload=null,extra={}){
 const headers={...(session?{cookie:await auth(session)}:{}),...(payload?{"content-type":"application/json",origin:site}:{}),...extra};
 const response=await fetch(site+path,{method,headers,body:payload?JSON.stringify(payload):undefined});
 const text=await response.text();let body=null;try{body=JSON.parse(text)}catch{}
 return {status:response.status,body,text,headers:response.headers};
}
const good={
 clarityProjectId:"u614k028k2",clarityEnabled:true,
 gtmContainerId:"GTM-ABCD1234",gtmEnabled:true,
};
async function rawSettings(){
 const r=await prisma.$runCommandRaw({find:"TrackingSettings",limit:1,sort:{createdAt:1}});
 return r.cursor.firstBatch[0]??null;
}
before(async()=>{
 await waitServer();
 const raw=await prisma.$runCommandRaw({insert:"TrackingSettings",documents:[{
  createdAt:new Date(),updatedAt:new Date(),
  facebookPixelId:existingPixel,gaMeasurementId:"G-SYNTHETIC123",
  facebookAccessToken:secret,gaApiSecret:secret,
 }]});
 assert.equal(raw.n,1);
 for(const [name,role,dashboardPermissions] of [
   ["admin","ADMIN",[]],["reader","STAFF",["platformConnections"]],
   ["manager","STAFF",["platformConnectionsManage"]],
   ["donor","DONOR",[]],
 ]){
  const user=await prisma.user.create({data:{name:"Tag "+name,
    role,dashboardPermissions,email:name+"-"+nonce+"@example.invalid"}});
  people.push(user.id);
  if(name==="admin")admin=user;if(name==="reader")reader=user;
  if(name==="manager")manager=user;if(name==="donor")donor=user;
 }
 browser=await chromium.launch({headless:true,args:["--no-sandbox"]});
});
test("real HTTP: protected GET/PUT, platform manager role and strict validation",async()=>{
 const url="/api/admin/tracking/integrations";
 assert.equal((await request(url)).status,401);
 assert.equal((await request(url,"PUT",null,good)).status,401);
 assert.equal((await request(url,"GET",donor)).status,403);
 assert.equal((await request(url,"GET",reader)).status,200);
 assert.equal((await request(url,"PUT",reader,good)).status,403);
 assert.equal((await request(url,"GET",manager)).status,200);
 assert.equal((await request(url,"PUT",manager,{...good,gaApiSecret:secret})).status,400);
 assert.equal((await request(url,"PUT",manager,{...good,gtmContainerId:"GTM-<img>"})).status,400);
 assert.equal((await request(url,"PUT",manager,{...good,clarityProjectId:"<script>"})).status,400);
 assert.equal((await request(url,"PUT",manager,{...good,clarityEnabled:"true"})).status,400);
 assert.equal((await request(url,"PUT",manager,good,{origin:"https://evil.example.invalid"})).status,403);
 assert.equal((await request(url,"PUT",manager,good,{origin:""})).status,403);
 const saved=await request(url,"PUT",manager,good);
 assert.equal(saved.status,200,saved.text);
 assert.equal(saved.body.clarity.enabled,true);assert.equal(saved.body.gtm.enabled,true);
 assert.equal(saved.body.clarity.source,"database");
 assert.equal(saved.body.connectionStatus,"not_verified");
 assert.equal(saved.body.clarity.lastExternalVerifiedAt,null);
 assert.equal(saved.text.includes(secret),false,"admin response must never expose secrets");
 const fromPublic=await request("/api/tracking/config");
 assert.equal(fromPublic.status,200);
 assert.equal(fromPublic.body.clarityProjectId,"u614k028k2");
 assert.equal(fromPublic.body.gtmContainerId,"GTM-ABCD1234");
 assert.equal(fromPublic.body.gtmEnabled,true);
 assert.equal(fromPublic.text.includes(secret),false,"public response must never expose secrets");
 const row=await rawSettings();
 assert.equal(row.facebookPixelId,existingPixel);
 assert.equal(row.facebookAccessToken,secret);
 assert.equal(row.gaApiSecret,secret);
 assert.equal(row.gtmContainerId,"GTM-ABCD1234");
 const log=await prisma.auditLog.findFirst({where:{action:"TRACKING_MANAGED_TAGS_UPDATED",actorId:manager.id}});
 assert.ok(log,"management change must be audited");
 assert.deepEqual(log.metadata.changedFields.slice().sort(),["clarityProjectId","clarityEnabled","gtmContainerId","gtmEnabled"].sort());
});
test("real Chromium desktop dashboard: persistence after reload, multilingual UI, no tag scripts in admin",async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 const token=await auth(admin);
 await context.addCookies([{name:"next-auth.session-token",value:decodeURIComponent(token.split("=")[1]),url:site,httpOnly:true,sameSite:"Lax"}]);
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.goto(site+"/dashboard/platform-connections/tracking",{waitUntil:"domcontentloaded"});
 await page.getByText("Microsoft Clarity",{exact:true}).first().waitFor({timeout:25000});
 const headings={ar:"إدارة Clarity وGTM",tr:"Clarity ve GTM",en:"Clarity and GTM",
   fr:"Clarity et GTM",id:"Clarity dan GTM",pt:"Clarity e GTM",
   es:"Clarity y GTM",de:"Clarity und GTM"};
 await page.waitForFunction(()=>document.querySelector('section[aria-label="Google Tag Manager"] input')?.value==="GTM-ABCD1234",{},{timeout:12000});
 for(const [code,heading] of Object.entries(headings)){
   await page.getByRole("combobox",{name:"Language"}).selectOption(code);
   await page.getByRole("heading",{name:heading}).waitFor({timeout:8000});
 }
 await page.getByRole("combobox",{name:"Language"}).selectOption("en");
 assert.equal(await page.locator('section[aria-label="Google Tag Manager"] input').first().inputValue(),"GTM-ABCD1234");
 await page.getByRole("button",{name:"Reload"}).click();
 await page.waitForFunction(()=>document.querySelector('section[aria-label="Google Tag Manager"] input')?.value==="GTM-ABCD1234",null,{timeout:10000});
 assert.equal(await page.locator('section[aria-label="Microsoft Clarity"] input').first().inputValue(),"u614k028k2");
 assert.equal(await page.locator("script[src*='/gtm.js']").count(),0);
 assert.equal(await page.locator("script[src*='clarity.ms/tag']").count(),0);
 await page.screenshot({path:"/tmp/yedi-managed-tags-desktop.png",fullPage:true});
 assert.deepEqual(errors,[]);
 await context.close();
});
test("real Chromium public site: consent gate, one injection, masked page and no purchase payload",async()=>{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 const errors=[];page.on("pageerror",e=>errors.push(e.message));
 await page.route(/(googletagmanager|clarity)/,route=>
   route.fulfill({status:200,contentType:"application/javascript",body:""}));
 await page.goto(site+"/en/privacy",{waitUntil:"domcontentloaded"});
 await page.getByRole("heading",{name:"Analytics privacy"}).waitFor({timeout:25000});
 assert.equal(await page.locator("script[data-yedi-managed-tag='gtm']").count(),0);
 assert.equal(await page.evaluate(()=>Boolean(window.__yediClarityProject)),false);
 await page.getByRole("button",{name:"Allow"}).click();
 await page.waitForFunction(()=>document.querySelectorAll('script[data-yedi-managed-tag="gtm"]').length===1,null,{timeout:15000});
 await page.waitForFunction(()=>Boolean(window.__yediClarityProject),null,{timeout:15000});
 assert.equal(await page.locator("script[data-yedi-managed-tag='gtm']").count(),1);
 assert.equal(await page.evaluate(()=>document.body.hasAttribute("data-clarity-mask")),true);
 const gtm=await page.evaluate(()=>window.yediGtmLayer??[]);
 assert.equal(gtm.filter(e=>e.event==="gtm.js").length,1);
 assert.equal(gtm.filter(e=>/purchase|donation|payment/i.test(String(e.event))).length,0);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2),true);
 await page.screenshot({path:"/tmp/yedi-managed-tags-mobile.png",fullPage:true});
 assert.deepEqual(errors,[]);
 await context.close();
});
test("Chromium denies legacy pixels and optional tags without consent, then clears on withdrawal",async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  const blockedHosts=[];
  await page.route(/(connect\\.facebook\\.net|analytics\\.tiktok\\.com|ads-twitter\\.com|googletagmanager\\.com|clarity\\.ms|contentsquare\\.net)/, route=>{
    blockedHosts.push(route.request().url());
    return route.fulfill({status:200,contentType:"application/javascript",body:""});
  });
  await page.goto(site+"/en/privacy",{waitUntil:"domcontentloaded"});
  await page.getByRole("heading",{name:"Analytics privacy"}).waitFor({timeout:25000});
  await page.waitForTimeout(800);
  assert.equal(blockedHosts.length,0,"optional vendor network must stay quiet before consent");
  await page.getByRole("button",{name:"Decline"}).click();
  await page.waitForTimeout(800);
  assert.equal(blockedHosts.length,0,"denial must not initialize a legacy loader");
  await page.getByRole("button",{name:"Tracking privacy"}).click();
  await page.getByRole("button",{name:"Allow"}).click();
  await page.waitForFunction(()=>Boolean(window.__yediGtmContainer),null,{timeout:12000});
  await page.getByRole("button",{name:"Tracking privacy"}).click();
  await page.getByRole("button",{name:"Decline"}).click();
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(()=>document.cookie.includes("yedi_analytics_consent=denied")),true);
  assert.equal(await page.evaluate(()=>Boolean(window.__yediGtmContainer)),false,"hard reload must unload tag container");
  await context.close();
});
test("Chromium public-to-private-to-public route history unloads and reinitializes tags",async()=>{
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies([{name:"yedi_analytics_consent",value:"granted",url:site,sameSite:"Lax"}]);
 const page=await context.newPage();
 await page.route(/(googletagmanager|clarity)/,route=>
   route.fulfill({status:200,contentType:"application/javascript",body:""}));
 await page.goto(site+"/en/privacy",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>Boolean(window.__yediGtmContainer),null,{timeout:15000});
 await page.evaluate(()=>window.history.pushState({},"","/en/checkout"));
 await page.waitForFunction(()=>location.pathname.includes("/checkout"),null,{timeout:15000});
 await page.waitForFunction(()=>!Boolean(window.__yediGtmContainer),null,{timeout:15000});
 assert.equal(await page.locator("script[data-yedi-managed-tag='gtm']").count(),0);
 await page.goBack({waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>Boolean(window.__yediGtmContainer),null,{timeout:15000});
 assert.equal(await page.locator("script[data-yedi-managed-tag='gtm']").count(),1);
 await page.goForward({waitUntil:"domcontentloaded"});
 assert.equal(await page.evaluate(()=>Boolean(window.__yediGtmContainer)),false);
 await context.close();
});
test("real HTTP disable persists; fresh browser with consent does not inject tags",async()=>{
 const disabled={...good,clarityEnabled:false,gtmEnabled:false};
 const put=await request("/api/admin/tracking/integrations","PUT",admin,disabled);
 assert.equal(put.status,200,put.text);
 const publicConfig=await request("/api/tracking/config");
 assert.equal(publicConfig.body.clarityEnabled,false);
 assert.equal(publicConfig.body.gtmEnabled,false);
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies([{name:"yedi_analytics_consent",value:"granted",url:site,sameSite:"Lax"}]);
 const page=await context.newPage();
 await page.goto(site+"/ar/privacy",{waitUntil:"domcontentloaded"});
 await page.waitForTimeout(1200);
 assert.equal(await page.locator("script[data-yedi-managed-tag='gtm']").count(),0);
 assert.equal(await page.evaluate(()=>Boolean(window.__yediClarityProject)),false);
 await context.close();
});
test("Chromium remote Clarity/GTM ID changes and disable unload old containers",async()=>{
 const first={...good,clarityProjectId:"u614k028k2",gtmContainerId:"GTM-ZYXW6789"};
 assert.equal((await request("/api/admin/tracking/integrations","PUT",admin,first)).status,200);
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addCookies([{name:"yedi_analytics_consent",value:"granted",url:site,sameSite:"Lax"}]);
 const page=await context.newPage();
 await page.route(/(googletagmanager|clarity)/,route=>
   route.fulfill({status:200,contentType:"application/javascript",body:""}));
 await page.goto(site+"/en/privacy",{waitUntil:"domcontentloaded"});
 await page.waitForFunction(()=>window.__yediGtmContainer==="GTM-ZYXW6789",null,{timeout:15000});
 const second={...first,clarityProjectId:"a614k028k3",gtmContainerId:"GTM-ABCD1234"};
 assert.equal((await request("/api/admin/tracking/integrations","PUT",admin,second)).status,200);
 await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await page.waitForFunction(()=>window.__yediGtmContainer==="GTM-ABCD1234",null,{timeout:15000});
 await page.waitForFunction(()=>window.__yediClarityProject==="a614k028k3",null,{timeout:15000});
 assert.equal(await page.locator("script[data-yedi-managed-tag='gtm']").count(),1);
 const disabled={...second,clarityEnabled:false,gtmEnabled:false};
 assert.equal((await request("/api/admin/tracking/integrations","PUT",admin,disabled)).status,200);
 await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await page.waitForFunction(()=>!window.__yediGtmContainer,null,{timeout:15000});
 assert.equal(await page.locator("script[data-yedi-managed-tag='gtm']").count(),0);
 await context.close();
});
after(async()=>{
 if(browser)await browser.close();
 for(const id of people)await prisma.auditLog.deleteMany({where:{actorId:id}});
 for(const id of people)await prisma.user.deleteMany({where:{id}});
 await prisma.$runCommandRaw({delete:"TrackingSettings",
   deletes:[{q:{facebookPixelId:existingPixel},limit:1}]});
 await prisma.$disconnect();
});
