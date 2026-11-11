import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, createHmac } from "node:crypto";
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
const subscriptionIds=[];
const invoiceIds=[];
const stripeSecret=process.env.STRIPE_WEBHOOK_SECRET;
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
 paidDonation=await createDonation({
   paidAt:new Date(),donorId:owner.id,provider:"STRIPE",
   providerOrderId:"pi_verified_"+nonce,providerAuthCode:"pi_verified_"+nonce,
   providerTxnResult:"Success",
   providerRaw:{verifiedStripe:{reference:"pi_verified_"+nonce,intentId:"pi_verified_"+nonce,
     amount:5025,currency:"usd"}},
 });
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
 assert.equal(receipt.status,409,"unsettled donations must never get an official PDF");
 assert.equal(receipt.data?.code,"RECEIPT_AWAITING_SETTLEMENT");
});
test("HTTP receipts: pending, failed, and bank-verified paid for guest, owner, STAFF, ADMIN",async()=>{
 const guestPaid=await createDonation({
   donorId:guest.id,paidAt:new Date(),provider:"STRIPE",
   providerOrderId:"pi_guest_"+nonce,providerAuthCode:"pi_guest_"+nonce,
   providerTxnResult:"Success",
   providerRaw:{verifiedStripe:{reference:"pi_guest_"+nonce,intentId:"pi_guest_"+nonce,
     amount:5025,currency:"usd"}},
 });
 const guestFailed=await createDonation({donorId:guest.id,status:"FAILED",provider:"STRIPE"});
 const ownerPending=await createDonation({donorId:owner.id});
 const ownerFailed=await createDonation({donorId:owner.id,status:"FAILED"});
 const matrices=[
   {actor:"GUEST",principal:null,rows:[guestDonation,guestFailed,guestPaid]},
   {actor:"DONOR",principal:owner,rows:[ownerPending,ownerFailed,paidDonation]},
   {actor:"STAFF",principal:authorizedStaff,rows:[ownerPending,ownerFailed,paidDonation]},
   {actor:"ADMIN",principal:admin,rows:[ownerPending,ownerFailed,paidDonation]},
 ];
 for(const m of matrices) {
   for(let i=0;i<m.rows.length;i++){
     const d=m.rows[i];
     const auth=m.principal?await cookie(m.principal):guestCookie(d,access.createGuestDonationAccess(d));
     const r=await get("/api/donations/"+d.id+"/receipt",auth);
     const expected=i===2?200:409;
     assert.equal(r.status,expected,JSON.stringify({actor:m.actor,id:d.id,status:r.status,body:r.text.slice(0,200)}));
     if(expected===200) assert.equal(r.headers.get("content-type")?.includes("pdf"),true);
     else assert.equal(r.data?.code,"RECEIPT_AWAITING_SETTLEMENT");
   }
 }
 assert.equal((await get("/api/donations/"+paidDonation.id+"/receipt",await cookie(staff))).status,403);
 assert.equal((await get("/api/donations/"+guestPaid.id+"/receipt")).status,403);
});
test("HTTP monthly Stripe receipt requires invoice settlement ledger",async()=>{
 const sub=await prisma.subscription.create({data:{
   donorId:guest.id,amount:50.25,currency:"USD",paymentMethod:"CARD",
   payforToken:"sub_receipt_"+nonce,
 }});
 subscriptionIds.push(sub.id);
 const paid=await createDonation({
   donorId:guest.id,subscriptionId:sub.id,provider:"STRIPE",paidAt:new Date(),
   providerOrderId:"in_receipt_"+nonce,providerAuthCode:"sub_receipt_"+nonce,
   providerTxnResult:"Success",
 });
 const auth=guestCookie(paid,access.createGuestDonationAccess(paid));
 assert.equal((await get("/api/donations/"+paid.id+"/receipt",auth)).status,409);
 await prisma.stripeInvoiceSettlement.create({data:{
   invoiceId:"in_receipt_"+nonce,subscriptionId:sub.id,donorId:guest.id,
   amountSmallestUnit:5024,currency:"usd",
 }});
 invoiceIds.push("in_receipt_"+nonce);
 assert.equal((await get("/api/donations/"+paid.id+"/receipt",auth)).status,409);
 await prisma.stripeInvoiceSettlement.update({where:{invoiceId:"in_receipt_"+nonce},
   data:{amountSmallestUnit:5025}});
 const r=await get("/api/donations/"+paid.id+"/receipt",auth);
 assert.equal(r.status,200,r.text.slice(0,250));
 assert.equal(r.headers.get("content-type")?.includes("pdf"),true);
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

async function sendSyntheticStripeEvent(type, donation, overrides={}) {
  if(!stripeSecret)throw Error("Synthetic Stripe webhook secret missing");
  const obj={
    id:donation.providerOrderId,
    object:"payment_intent",status:type==="payment_intent.succeeded"?"succeeded":"requires_payment_method",
    currency:"usd",amount:5025,amount_received:type==="payment_intent.succeeded"?5025:0,
    metadata:{donationId:donation.id,userId:donation.donorId},...overrides,
  };
  const event={id:"evt_synthetic_"+randomBytes(8).toString("hex"),type,object:"event",
    created:Math.floor(Date.now()/1000),livemode:false,data:{object:obj}};
  const payload=JSON.stringify(event),t=Math.floor(Date.now()/1000);
  const signature=createHmac("sha256",stripeSecret).update(t+"."+payload).digest("hex");
  const res=await fetch(base+"/api/stripe/webhook",{method:"POST",
    headers:{"content-type":"application/json","stripe-signature":`t=${t},v1=${signature}`},
    body:payload});
  return{status:res.status,body:await res.text()};
}
test("signed HTTP Stripe failure-before-success, success-before-failure and concurrent callbacks",async()=>{
  for(const order of ["failed-first","success-first","parallel","legacy-failed"]){
    const d=await createDonation({
      donorId:owner.id,provider:"STRIPE",providerOrderId:"pi_order_"+order+"_"+nonce,
      ...(order==="legacy-failed"?{status:"FAILED",providerTxnResult:"Failed"}:{}),
    });
    await prisma.donationItem.create({data:{donationId:d.id,campaignId,amount:20,amountUSD:20}});
    const before=(await prisma.campaign.findUnique({where:{id:campaignId}})).currentAmount;
    const fail=()=>sendSyntheticStripeEvent("payment_intent.payment_failed",d);
    const success=()=>sendSyntheticStripeEvent("payment_intent.succeeded",d);
    let responses;
    if(order==="failed-first"){responses=[await fail(),await success(),await fail()]}
    else if(order==="success-first"){responses=[await success(),await fail(),await success()]}
    else if(order==="legacy-failed"){responses=[await success(),await fail()]}
    else responses=await Promise.all([fail(),success(),fail(),success(),success()]);
    assert.ok(responses.every(r=>r.status===200),JSON.stringify({order,responses}));
    const saved=await prisma.donation.findUnique({where:{id:d.id}});
    assert.equal(saved.status,"PAID",order);
    assert.ok(saved.paidAt,order);
    assert.equal(saved.providerOrderId,d.providerOrderId,order);
    const after=(await prisma.campaign.findUnique({where:{id:campaignId}})).currentAmount;
    assert.equal(after,before+20,"project credit exactly once: "+order);
  }
});
test("HTTP unsigned or invalid-signature success cannot settle",async()=>{
 const d=await createDonation({donorId:owner.id,provider:"STRIPE",providerOrderId:"pi_unsigned_"+nonce});
 const payload=JSON.stringify({id:"evt_unsigned_"+nonce,object:"event",
   type:"payment_intent.succeeded",created:Math.floor(Date.now()/1000),
   data:{object:{id:d.providerOrderId,object:"payment_intent",
     status:"succeeded",amount:5025,amount_received:5025,currency:"usd",
     metadata:{donationId:d.id,userId:owner.id}}}});
 const r=await fetch(base+"/api/stripe/webhook",{method:"POST",
   headers:{"content-type":"application/json","stripe-signature":"t=1,v1=invalid"},
   body:payload});
 assert.equal(r.status,400);
 assert.equal((await prisma.donation.findUnique({where:{id:d.id}})).paidAt,null);
});
test("signed HTTP Stripe amount/currency/owner/reference mismatches never settle",async()=>{
 const d=await createDonation({donorId:owner.id,provider:"STRIPE",providerOrderId:"pi_mismatch_"+nonce});
 const mismatches=[
   {amount:5024,amount_received:5024},{currency:"eur"},{metadata:{donationId:d.id,userId:outsider.id}},
   {id:"pi_wrong_reference_"+nonce},{status:"requires_action"},
 ];
 for(const bad of mismatches){
   const r=await sendSyntheticStripeEvent("payment_intent.succeeded",d,bad);
   assert.equal(r.status,200,r.body);
   const row=await prisma.donation.findUnique({where:{id:d.id}});
   assert.equal(row.paidAt,null);
   assert.equal(row.providerOrderId,d.providerOrderId);
 }
});
test("HTTP retry is blocked for uncertain, FAILED and settled attempts, even while original succeeds",async()=>{
 const d=await createDonation({donorId:owner.id,provider:"STRIPE",providerOrderId:"pi_retry_"+nonce});
 const path="/api/donations/"+d.id+"/retry";
 const post=async auth=>{
   const r=await fetch(base+path,{method:"POST",headers:auth?{cookie:auth}:{}});
   return{status:r.status,data:await r.json()};
 };
 assert.equal((await post()).status,403);
 assert.equal((await post(await cookie(outsider))).status,403);
 const caller=await cookie(owner);
 const before=await prisma.donation.count({where:{donorId:owner.id}});
 let result=await Promise.all(Array.from({length:6},()=>post(caller)));
 assert.ok(result.every(r=>r.status===409&&r.data.code==="RETRY_AWAITING_BANK_VERIFICATION"));
 await prisma.donation.update({where:{id:d.id},data:{status:"FAILED"}});
 result=await Promise.all([post(caller),sendSyntheticStripeEvent("payment_intent.succeeded",d),post(caller)]);
 assert.equal(result[1].status,200);
 assert.equal(result[0].status,409);
 assert.equal(result[2].status,409);
 const row=await prisma.donation.findUnique({where:{id:d.id}});
 assert.equal(row.status,"PAID");assert.ok(row.paidAt);
 const latest=await post(caller);
 assert.equal(latest.data.code,"ALREADY_SETTLED");
 assert.equal(await prisma.donation.count({where:{donorId:owner.id}}),before);
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

async function sendSyntheticRecurringInvoiceEvent(type,sub,invoiceId,reason="subscription_cycle") {
  if(!stripeSecret)throw Error("Synthetic Stripe webhook secret missing");
  const paid=type==="invoice.payment_succeeded";
  const payload=JSON.stringify({
    id:"evt_invoice_"+nonce+"_"+Date.now()+"_"+randomBytes(3).toString("hex"),
    object:"event",type,created:Math.floor(Date.now()/1000),livemode:false,
    data:{object:{
      id:invoiceId,object:"invoice",created:Math.floor(Date.now()/1000),
      parent:{subscription_details:{subscription:sub.payforToken}},
      billing_reason:reason,status:paid?"paid":"open",paid,
      currency:"usd",amount_paid:paid?5025:0,amount_due:5025
    }},
  });
  const t=Math.floor(Date.now()/1000);
  const signature=createHmac("sha256",stripeSecret).update(t+"."+payload).digest("hex");
  const response=await fetch(base+"/api/stripe/webhook",{
    method:"POST",headers:{"content-type":"application/json",
      "stripe-signature":"t="+t+",v1="+signature},body:payload
  });
  return {status:response.status,text:(await response.text()).slice(0,400)};
}
test("signed subscription invoices: failure-success orders and replay credit a campaign once",async()=>{
  for(const order of ["failed-first","success-first","pending-first"]){
    const invoiceId="in_order_"+order+"_"+nonce;
    const sub=await prisma.subscription.create({data:{
      donorId:owner.id,payforToken:"sub_order_"+order+"_"+nonce,
      status:"ACTIVE",amount:50.25,currency:"USD",
      paymentMethod:"CARD",teamSupport:0,coverFees:false,
    }});
    subscriptionIds.push(sub.id);
    await prisma.subscriptionItem.create({data:{
      subscriptionId:sub.id,campaignId,amount:20,amountUSD:20,
    }});
    if(order==="pending-first"){
      await createDonation({donorId:owner.id,subscriptionId:sub.id,
        provider:"STRIPE",providerOrderId:invoiceId,paidAt:null});
    }
    invoiceIds.push(invoiceId);
    const before=(await prisma.campaign.findUnique({where:{id:campaignId}})).currentAmount;
    const failed=()=>sendSyntheticRecurringInvoiceEvent("invoice.payment_failed",sub,invoiceId);
    const paid=()=>sendSyntheticRecurringInvoiceEvent("invoice.payment_succeeded",sub,invoiceId);
    const responses=order==="failed-first"?
      [await failed(),await paid(),await failed(),await paid()]:
      [await paid(),await failed(),await paid()];
    assert.ok(responses.every(r=>r.status===200),JSON.stringify({order,responses}));
    const entries=await prisma.donation.findMany({where:{subscriptionId:sub.id,providerOrderId:invoiceId}});
    donationIds.push(...entries.map(x=>x.id));
    assert.equal(entries.filter(x=>x.status==="PAID"&&x.paidAt).length,1,order);
    assert.equal(entries.length,1,order+": same invoice must not leave duplicate donation rows");
    assert.equal(await prisma.stripeInvoiceSettlement.count({where:{invoiceId}}),1,order);
    assert.equal((await prisma.campaign.findUnique({where:{id:campaignId}})).currentAmount,before+20,order);
  }
});



test("concurrent signed paid invoices cannot credit monthly project more than once",async()=>{
  const invoiceId="in_parallel_"+nonce;
  const sub=await prisma.subscription.create({data:{
    donorId:owner.id,payforToken:"sub_parallel_"+nonce,status:"ACTIVE",
    amount:50.25,currency:"USD",paymentMethod:"CARD",teamSupport:0,coverFees:false,
  }});
  subscriptionIds.push(sub.id);
  await prisma.subscriptionItem.create({data:{
    subscriptionId:sub.id,campaignId,amount:20,amountUSD:20,
  }});
  invoiceIds.push(invoiceId);
  const before=(await prisma.campaign.findUnique({where:{id:campaignId}})).currentAmount;
  const responses=await Promise.all(Array.from({length:5},()=>
    sendSyntheticRecurringInvoiceEvent("invoice.payment_succeeded",sub,invoiceId)
  ));
  // Transient Mongo transaction conflicts may return 500 and be retried by
  // Stripe; a subsequent authentic replay must acknowledge the settled row.
  assert.ok(responses.every(r=>r.status===200||r.status===500),JSON.stringify(responses));
  const replay=await sendSyntheticRecurringInvoiceEvent("invoice.payment_succeeded",sub,invoiceId);
  assert.equal(replay.status,200,replay.text);
  const entries=await prisma.donation.findMany({where:{
    subscriptionId:sub.id,providerOrderId:invoiceId,
  }});
  donationIds.push(...entries.map(x=>x.id));
  assert.equal(entries.filter(x=>x.status==="PAID"&&x.paidAt).length,1);
  assert.equal(entries.length,1,"a paid invoice has one donation row");
  assert.equal(await prisma.stripeInvoiceSettlement.count({where:{invoiceId}}),1);
  assert.equal((await prisma.campaign.findUnique({where:{id:campaignId}})).currentAmount,before+20);
});

test("signed recurring invoice cannot choose between duplicate Stripe subscription references",async()=>{
  const token="sub_duplicate_"+nonce;
  const invoiceId="in_duplicate_"+nonce;
  const subs=[];
  for(const donorId of [owner.id,outsider.id]){
    const row=await prisma.subscription.create({data:{
      donorId,payforToken:token,amount:50.25,currency:"USD",
      paymentMethod:"CARD",status:"ACTIVE",teamSupport:0,coverFees:false,
    }});
    subs.push(row);subscriptionIds.push(row.id);
  }
  const before=await prisma.stripeInvoiceSettlement.count({where:{invoiceId}});
  assert.equal(before,0);
  const result=await sendSyntheticRecurringInvoiceEvent("invoice.payment_succeeded",subs[0],invoiceId);
  assert.equal(result.status,200,result.text);
  assert.equal(await prisma.stripeInvoiceSettlement.count({where:{invoiceId}}),0);
  assert.equal(await prisma.donation.count({where:{providerOrderId:invoiceId}}),0);
});

test("HTTP donation comments are private to owner or revenue team",async()=>{
  const path="/api/donations/"+guestDonation.id+"/comments";
  const outsiderCookie=await cookie(outsider);
  const denied=await get(path,outsiderCookie);
  assert.equal(denied.status,403);
  const count=await prisma.comment.count({where:{donationId:guestDonation.id}});
  const posted=await fetch(base+path,{method:"POST",
    headers:{"content-type":"application/json",cookie:outsiderCookie},
    body:JSON.stringify({text:"synthetic unauthorized comment"})});
  assert.equal(posted.status,403);
  assert.equal(await prisma.comment.count({where:{donationId:guestDonation.id}}),count);
  const allowed=await get(path,await cookie(admin));
  assert.equal(allowed.status,200);
});
after(async()=>{
 for(const invoiceId of invoiceIds)await prisma.stripeInvoiceSettlement.deleteMany({where:{invoiceId}});
 for(const id of donationIds){
  await prisma.donationItem.deleteMany({where:{donationId:id}});
  await prisma.donationCategoryItem.deleteMany({where:{donationId:id}});
  await prisma.donation.deleteMany({where:{id}});
 }
 for(const id of subscriptionIds){
  await prisma.subscriptionItem.deleteMany({where:{subscriptionId:id}});
  await prisma.subscriptionCategoryItem.deleteMany({where:{subscriptionId:id}});
  await prisma.subscription.deleteMany({where:{id}});
 }
 if(campaignId)await prisma.campaign.deleteMany({where:{id:campaignId}});
 if(categoryId)await prisma.category.deleteMany({where:{id:categoryId}});
 for(const id of userIds)await prisma.user.deleteMany({where:{id}});
 await prisma.$disconnect();
});
