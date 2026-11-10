import assert from "node:assert/strict";
import test, { before, after } from "node:test";
import { randomBytes, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";
import * as guestIntentModule from "../../lib/payfor-guest-intent.ts";
const issueGuestPayForIntent = guestIntentModule.issueGuestPayForIntent ?? guestIntentModule.default?.issueGuestPayForIntent;
if (typeof issueGuestPayForIntent !== "function") throw new Error("Guest capability helper unavailable");

const url = process.env.DATABASE_URL || "";
if (process.env.CI_MONGO_ISOLATED !== "1" ||
    !/^mongodb:\/\/127\.0\.0\.1:27017\/yedi_ci_[a-z_]+\?/.test(url) ||
    process.env.NEXTAUTH_URL !== "http://127.0.0.1:3109") {
  throw new Error("HTTP payment tests must only run against isolated loopback MongoDB");
}
const prisma = new PrismaClient();
const base = "http://127.0.0.1:3109";
const random = randomBytes(5).toString("hex");
const creds = { merchantId: process.env.PAYFOR_MERCHANT_ID,
  merchantPass: process.env.PAYFOR_MERCHANT_PASS,
  userCode: process.env.PAYFOR_USER_CODE };
const userIds = [];
const donationIds = [];
let donor, outsider, guest, pending, paid, inFlight, failed;

async function ready() {
  for (let i=0; i<90; i++) {
    try { if ((await fetch(base + "/api/categories?limit=1")).ok) return; } catch {}
    await new Promise(resolve=>setTimeout(resolve,1000));
  }
  throw new Error("Next.js server did not become ready");
}
function signedResponse(orderId, kind) {
  const f = {
    OrderId: orderId,
    ProcReturnCode: kind === "ok" ? "00" : "05",
    "3DStatus": kind === "ok" ? "1" : "0",
    AuthCode: kind === "ok" ? "ABC123" : "",
    ResponseRnd: random + "-bank",
    PurchAmount: "200.00", Currency: "949",
  };
  const joined = [
    creds.merchantId, creds.merchantPass, f.OrderId, f.AuthCode,
    f.ProcReturnCode, f["3DStatus"], f.ResponseRnd, creds.userCode,
  ].join("");
  f.ResponseHash = createHash("sha1").update(joined).digest("base64");
  return new URLSearchParams(f);
}
async function request(endpoint, body, cookie) {
  const r = await fetch(base + endpoint, {
    method: "POST", redirect: "manual",
    headers: {
      ...(body instanceof URLSearchParams
        ? { "content-type": "application/x-www-form-urlencoded" }
        : { "content-type": "application/json" }),
      ...(cookie ? { cookie } : {}),
    },
    body: body instanceof URLSearchParams ? body.toString() : JSON.stringify(body),
  });
  let json = null;
  try { json = await r.json(); } catch {}
  return { status: r.status, body: json, location: r.headers.get("location") || "" };
}
async function cookie(user) {
  const token = await encode({
    token: { sub: user.id, email: user.email, name: user.name },
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 3600,
  });
  return "next-auth.session-token=" + encodeURIComponent(token);
}
async function makeDonation(fields={}) {
  const x = await prisma.donation.create({
    data: {
      donorId: fields.donorId || donor.id,
      amount: 200,
      totalAmount: 200,
      currency: "USD",
      status: "PAID",
      paymentMethod: "CARD",
      ...fields,
    }
  });
  donationIds.push(x.id);
  return x;
}
before(async () => {
  await ready();
  for(const name of ["donor","outsider","guest"]) {
    const user=await prisma.user.create({
      data: { name, email: name + "-" + random + "@example.invalid", role:"DONOR" },
    });
    userIds.push(user.id);
    if(name==="donor")donor=user;
    if(name==="outsider")outsider=user;
    if(name==="guest")guest=user;
  }
  pending=await makeDonation({donorId:guest.id});
  paid=await makeDonation({paidAt:new Date()});
  inFlight=await makeDonation({provider:"PAYFOR", providerOrderId:"inflight-ref",
    providerRaw:{payforRequest:{orderId:"inflight-ref",purchAmount:"200.00",currency:"949"}}});
  failed=await makeDonation({status:"FAILED"});
});
test("HTTP initiation denies guessed guest ID and another user's session", async()=>{
  const url="/api/payfor/3dpay/initiate";
  const u=await request(url,{donationId:pending.id});
  assert.equal(u.status,403,JSON.stringify(u));
  const o=await request(url,{donationId:pending.id},await cookie(outsider));
  assert.equal(o.status,403,JSON.stringify(o));
  const token=issueGuestPayForIntent(pending);
  const valid=await request(url,{donationId:pending.id,paymentIntentToken:token});
  assert.equal(valid.status,503,JSON.stringify(valid));
  assert.equal(JSON.stringify(valid).includes("UserPass"),false);
  assert.equal(JSON.stringify(valid).includes("Pan"),false);
});
test("HTTP initiation blocks settled, failed, and in-flight donors", async()=>{
  for(const d of [paid,inFlight,failed]) {
    const r=await request("/api/payfor/3dpay/initiate",{donationId:d.id},await cookie(donor));
    assert.equal(r.status,409,JSON.stringify({donation:d.id,response:r}));
  }
  const saved=await request("/api/payfor/3dpay/initiate",{donationId:pending.id,savedCardId:"test"},await cookie(guest));
  assert.equal(saved.status,403);
});
test("signed success/failure callbacks racing and replayed cannot settle without bank amount proof",async()=>{
  const orderId=pending.id;
  const urls=["/api/payfor/3dpay/ok","/api/payfor/3dpay/fail"];
  const results=await Promise.all(Array.from({length:20},(_,i)=>
    request(urls[i%2]+"?donationId="+orderId+"&locale=en",
      signedResponse(orderId,i%2===0?"ok":"fail"))));
  assert.ok(results.every(r=>r.status===303||r.status===302||r.status===307),JSON.stringify(results));
  const d=await prisma.donation.findUnique({where:{id:orderId}});
  assert.equal(d.paidAt,null);
  assert.equal(d.provider,null);
  assert.notEqual(d.status,"FAILED");
});
test("card vault POST is refused without storing any card",async()=>{
  const r=await request("/api/credit-cards",{ cardNumber:"4111111111111111",
    expiryDate:"12/30",cvc:"123" },await cookie(donor));
  assert.equal(r.status,403,JSON.stringify(r));
  assert.equal(await prisma.creditCard.count({where:{userId:donor.id}}),0);
});
after(async()=>{
  for(const id of donationIds) await prisma.donation.deleteMany({where:{id}});
  for(const id of userIds) await prisma.user.deleteMany({where:{id}});
  await prisma.$disconnect();
});
