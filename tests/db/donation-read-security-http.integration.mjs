import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import * as accessModule from "../../lib/donations/guest-access.ts";
import * as stripeModule from "../../lib/donations/stripe-settlement.ts";

const access=accessModule.default ?? accessModule;
const stripe=stripeModule.default ?? stripeModule;
const db=process.env.DATABASE_URL || "";
const base="http://127.0.0.1:3112";
if(process.env.CI_MONGO_ISOLATED!=="1" ||
 !/^mongodb:\/\/127\.0\.0\.1:27017\/yedi_ci_[a-z_]+\?/.test(db) ||
 process.env.NEXTAUTH_URL!==base) throw new Error("Refusing non-isolated CI");
const prisma=new PrismaClient();
const nonce=randomBytes(5).toString("hex");
const userIds=[];
const donationIds=[];
let owner,outsider,staff,authorizedStaff,admin,guest,guestDonation,paidDonation;
let categoryId,campaignId;
async function ready(){for(let i=0;i<90;i++){try{if((await fetch(base+"/api/categories?limit=1")).ok)return}catch{}await new Promise(r=>setTimeout(r,1000))}throw Error("Next unavailable")}
async function cookie(user){const token=await encode({token:{sub:user.id,email:user.email,name:user.name,role:user.role,dashboardPermissions:user.dashboardPermissions},secret:process.env.NEXTAUTH_SECRET,maxAge:3600});return "next-auth.session-token="+encodeURIComponent(token)}
function guestCookie(d,token){return access.guestDonationCookieName(d.id)+"="+encodeURIComponent(token)}
async function get(path,authorization){const response=await fetch(base+path,{headers:authorization?{cookie:authorization}:{},redirect:"manual"});const text=await response.text();let data=null;try{data=JSON.parse(text)}catch{}return{status:response.status,data,headers:response.headers,text:text.slice(0,1600)}}
async function createDonation(data={}){let d=await prisma.donation.create({data:{donorId:owner.id,status:"PAID",paymentMethod:"CARD",amount:50.25,totalAmount:50.25,currency:"USD",...data}});donationIds.push(d.id);return d}
before(async()=>{
 await ready();
 for(const [name,role,perms] of [["owner","DONOR",[]],["outsider","DONOR",[]],["staff","STAFF",[]],["authorizedStaff","STAFF",["revenue"]],["admin","ADMIN",[]],["guest","DONOR",[]]]){
  const u=await prisma.user.create({data:{name,email:name+"-"+nonce+"@example.invalid",role,dashboardPermissions:perms,phone:"+900000000000"}});userIds.push(u.id);
  if(name==="owner")owner=u;if(name==="outsider")outsider=u;
  if(name==="staff")staff=u;if(name==="authorizedStaff")authorizedStaff=u;
  if(name==="admin")admin=u;if(name==="guest")guest=u;
 }
 guestDonation=await createDonation({donorId:guest.id,provider:"STRIPE",providerOrderId:"pi_unconfirmed_synthetic"});
 paidDonation=await createDonation({paidAt:new Date(),donorId:owner.id});
 campaignId=(await prisma.campaign.create({data:{title:"Synthetic project-"+nonce,description:"Isolated",targetAmount:5000,currentAmount:12,images:[],categoryIds:[]}})).id;
 categoryId=(await prisma.category.create({data:{name:"Synthetic category-"+nonce,currentAmount:7,campaignIds:[]}})).id;
});
test("HTTP unauthenticated ID cannot disclose details, receipt or payment status",async()=>{
 for(const endpoint of ["","/status","/receipt","/tracking"]){
  const r=await get("/api/donations/"+guestDonation.id+endpoint);
  assert.equal(r.status,403,JSON.stringify({endpoint,status:r.status}));
  assert.equal(r.text.includes("@example.invalid"),false);
 }
 const before=await prisma.donation.findUnique({where:{id:guestDonation.id}});
 const r=await get("/api/donations/"+guestDonation.id+"/status");
 assert.equal(r.status,403);
 const after=await prisma.donation.findUnique({where:{id:guestDonation.id}});
 assert.equal(after.paidAt,null);assert.equal(after.providerOrderId,before.providerOrderId);
});
test("HTTP valid guest cookie can read only own redacted details, minimal status and receipt",async()=>{
 const token=access.createGuestDonationAccess(guestDonation);
 const c=guestCookie(guestDonation,token);
 const details=await get("/api/donations/"+guestDonation.id,c);
 assert.equal(details.status,200,details.text);
 assert.equal(details.data.donor,null);
 assert.equal(details.text.includes("phone"),false);
 assert.equal(details.text.includes("email"),false);
 assert.equal(details.text.includes("providerRaw"),false);
 const status=await get("/api/donations/"+guestDonation.id+"/status",c);
 assert.equal(status.status,200,status.text);
 assert.deepEqual(Object.keys(status.data).sort(),["paidAt","status"].sort());
 assert.equal(status.data.status,"PENDING");
 const wrong=await get("/api/donations/"+paidDonation.id+"/status",c);
 assert.equal(wrong.status,403);
 const receipt=await get("/api/donations/"+guestDonation.id+"/receipt",c);
 assert.equal(receipt.status,200,receipt.text.slice(0,300));
 assert.equal(receipt.headers.get("content-type")?.includes("pdf"),true);
});
test("HTTP tampered and expired guest capabilities are refused",async()=>{
 const token=access.createGuestDonationAccess(guestDonation);
 const modified=guestCookie(guestDonation,token.slice(0,-1)+(token.at(-1)==="A"?"B":"A"));
 assert.equal((await get("/api/donations/"+guestDonation.id+"/status",modified)).status,403);
 const old=access.createGuestDonationAccess(guestDonation,Date.now()-25*60*60*1000);
 assert.equal((await get("/api/donations/"+guestDonation.id+"/status",guestCookie(guestDonation,old))).status,403);
});
test("HTTP owner, outsider, unprivileged staff, privileged staff and admin enforced",async()=>{
 for(const [user,expected] of [[owner,200],[outsider,403],[staff,403],[authorizedStaff,200],[admin,200]]){
  const r=await get("/api/donations/"+paidDonation.id,await cookie(user));
  assert.equal(r.status,expected,JSON.stringify({user:user.name,status:r.status}));
  if(expected===200)assert.equal(r.data.donor?.email,owner.email);
 }
});
test("HTTP payment status reads cannot trigger financial reconciliation or project increments",async()=>{
 await prisma.donationItem.create({data:{donationId:guestDonation.id,campaignId,amount:50.25,amountUSD:50.25}});
 const c=guestCookie(guestDonation,access.createGuestDonationAccess(guestDonation));
 const responses=await Promise.all(Array.from({length:12},()=>get("/api/donations/"+guestDonation.id+"/status",c)));
 assert.ok(responses.every(r=>r.status===200&&r.data.status==="PENDING"));
 const d=await prisma.donation.findUnique({where:{id:guestDonation.id}});
 const campaign=await prisma.campaign.findUnique({where:{id:campaignId}});
 assert.equal(d.paidAt,null);assert.equal(campaign.currentAmount,12);
});
test("isolated Stripe payment mismatch rejected and concurrent valid settlement credits once",async()=>{
 const d=await createDonation({donorId:owner.id,provider:"STRIPE",providerOrderId:"pi_synthetic_one_time"});
 await prisma.donationItem.create({data:{donationId:d.id,campaignId,amount:20,amountUSD:20}});
 await prisma.donationCategoryItem.create({data:{donationId:d.id,categoryId,amount:30.25,amountUSD:30.25}});
 const proof={kind:"intent",reference:"pi_synthetic_one_time",intentId:"pi_synthetic_one_time",donationId:d.id,donorId:owner.id,
 status:"succeeded",currency:"usd",amountSmallestUnit:5025,paidSmallestUnit:5025};
 for(const change of [{currency:"eur"},{donorId:outsider.id},{amountSmallestUnit:5024},{paidSmallestUnit:5024},{reference:"pi_other"},{status:"requires_action"}]){
  assert.equal(await stripe.settleVerifiedStripeDonation({...proof,...change}),"skipped");
 }
 assert.equal((await prisma.donation.findUnique({where:{id:d.id}})).paidAt,null);
 const results=await Promise.allSettled(Array.from({length:8},()=>stripe.settleVerifiedStripeDonation(proof)));
 assert.equal(results.filter(r=>r.status==="fulfilled"&&r.value==="paid").length,1,JSON.stringify(results));
 assert.ok((await prisma.donation.findUnique({where:{id:d.id}})).paidAt);
 assert.equal((await prisma.campaign.findUnique({where:{id:campaignId}})).currentAmount,32);
 assert.equal((await prisma.category.findUnique({where:{id:categoryId}})).currentAmount,37.25);
 assert.equal(await stripe.settleVerifiedStripeDonation(proof),"skipped");
});
test("isolated recurring invoice unique ledger rejects parallel replay",async()=>{
  const invoiceId="in_synthetic_concurrency_"+nonce;
  const data={invoiceId,subscriptionId:owner.id,donorId:owner.id,
    currency:"usd",amountSmallestUnit:5025};
  const results=await Promise.allSettled(Array.from({length:8},()=>
    prisma.stripeInvoiceSettlement.create({data})));
  const winners=results.filter(r=>r.status==="fulfilled");
  assert.equal(winners.length,1,JSON.stringify(results.map(r=>r.status)));
  assert.equal(await prisma.stripeInvoiceSettlement.count({where:{invoiceId}}),1);
  await prisma.stripeInvoiceSettlement.deleteMany({where:{invoiceId}});
});
after(async()=>{
 for(const id of donationIds){
  await prisma.donationItem.deleteMany({where:{donationId:id}});
  await prisma.donationCategoryItem.deleteMany({where:{donationId:id}});
  await prisma.donation.deleteMany({where:{id}});
 }
 if(campaignId)await prisma.campaign.deleteMany({where:{id:campaignId}});
 if(categoryId)await prisma.category.deleteMany({where:{id:categoryId}});
 for(const id of userIds)await prisma.user.deleteMany({where:{id}});
 await prisma.$disconnect();
});
