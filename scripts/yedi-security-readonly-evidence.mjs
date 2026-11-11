/**
 * Read-only finance release evidence. Never mutates donations, indexes or
 * transactions. Explicit approval required for any non-CI target.
 * Reports index shape and key-rotation readiness, not donor or bank data.
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
const url=process.env.DATABASE_URL || "";
const isolated=process.env.CI_MONGO_ISOLATED==="1" &&
  /^mongodb:\/\/127\.0\.0\.1:27017\/yedi_ci_[a-z_]+\?/.test(url);
const authorizedReadOnly=process.env.YEDI_AUTHORIZED_READ_ONLY_INDEX_AUDIT==="YES_I_HAVE_APPROVAL";
if(!isolated && !authorizedReadOnly) {
  throw Error("REFUSED: specify isolated CI database or explicit operator-approved read-only index audit");
}
const key=process.env.DONATION_GUEST_ACCESS_SECRET || "";
const separate=Boolean(key) && key!==process.env.NEXTAUTH_SECRET;
const keyOk=Buffer.byteLength(key,"utf8")>=32 && separate;
console.log("Dedicated guest key ready: "+(keyOk?"YES":"NO"));
const previous=process.env.DONATION_GUEST_ACCESS_PREVIOUS_SECRET;
const until=Number(process.env.DONATION_GUEST_ACCESS_PREVIOUS_VALID_UNTIL);
const now=Math.floor(Date.now()/1000);
const rotationOk=!previous || (Buffer.byteLength(previous,"utf8")>=32 &&
  Number.isSafeInteger(until) && until>=now && until<=now+86400);
console.log("Previous-key rotation window valid: "+(rotationOk?"YES":"NO"));
const prisma=new PrismaClient();
try {
  const response=await prisma.$runCommandRaw({listIndexes:"StripeInvoiceSettlement"});
  const batch=response?.cursor?.firstBatch;
  assert.ok(Array.isArray(batch),"Cannot inspect Stripe invoice indexes");
  const unique=batch.some(index=>
    index.unique===true && index.key &&
    Object.keys(index.key).length===1 && index.key.invoiceId===1
  );
  console.log("StripeInvoiceSettlement.invoiceId unique index: "+(unique?"PRESENT":"MISSING"));
  if(!unique)process.exitCode=2;
  if(!keyOk || !rotationOk)process.exitCode=2;
} finally {
  await prisma.$disconnect();
}
