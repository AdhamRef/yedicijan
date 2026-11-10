import test from "node:test";
import assert from "node:assert/strict";
// @ts-expect-error Standalone Node/tsx runner requires explicit .ts extension.
import * as tokenModule from "../../lib/donations/guest-access.ts";
// @ts-expect-error Standalone Node/tsx runner requires explicit .ts extension.
import * as settlementModule from "../../lib/donations/stripe-settlement.ts";
const { createGuestDonationAccess, verifyGuestDonationAccess } =
  ((tokenModule as typeof tokenModule & {default?:typeof tokenModule}).default ?? tokenModule);
const { stripePaymentMatches, stripeRecurringInvoiceMatches } =
  ((settlementModule as typeof settlementModule & {default?:typeof settlementModule}).default ?? settlementModule);

process.env.DONATION_GUEST_ACCESS_SECRET="synthetic-test-only-secret-not-production-0123456789";
const now=Date.UTC(2026,10,10,14,0,0);
const base={
  id:"507f191e810c19729de860ea", donorId:"507f1f77bcf86cd799439011",
  createdAt:new Date(now-2000), totalAmount:50.25, currency:"USD",
};
test("guest token is owner-, donation-, amount- and expiry-bound",()=>{
  const t=createGuestDonationAccess(base,now)!;
  assert.ok(verifyGuestDonationAccess(t,base,now));
  assert.equal(verifyGuestDonationAccess(t,base,now+24*60*60*1000+2000),false);
  assert.equal(verifyGuestDonationAccess(t,{...base,id:"507f191e810c19729de860eb"},now),false);
  assert.equal(verifyGuestDonationAccess(t,{...base,donorId:"507f1f77bcf86cd799439012"},now),false);
  assert.equal(verifyGuestDonationAccess(t,{...base,totalAmount:50.26},now),false);
  assert.equal(verifyGuestDonationAccess(t,{...base,currency:"EUR"},now),false);
  assert.equal(verifyGuestDonationAccess(t,t as any,now),false);
  assert.equal(verifyGuestDonationAccess(t+"a",base,now),false);
  assert.equal(verifyGuestDonationAccess(base.id,base,now),false);
});
function donation(override={}) {
  return {...base, status:"PAID",paidAt:null,provider:"STRIPE",
    providerOrderId:"pi_synthetic_123",subscriptionId:null,...override};
}
function proof(override={}) {
  return {kind:"intent" as const,reference:"pi_synthetic_123",
    intentId:"pi_synthetic_123",donationId:base.id,donorId:base.donorId,
    currency:"usd",amountSmallestUnit:5025,paidSmallestUnit:5025,
    status:"succeeded",...override};
}
test("financial comparison rejects any mismatch without touching database",()=>{
  assert.equal(stripePaymentMatches(donation(),proof()),true);
  const invalid=[
    proof({reference:"pi_wrong"}),proof({intentId:"bad-reference"}),
    proof({donationId:"507f191e810c19729de860eb"}),
    proof({donorId:"507f1f77bcf86cd799439012"}),
    proof({currency:"eur"}),proof({amountSmallestUnit:5024}),
    proof({paidSmallestUnit:5024}),proof({status:"processing"}),
  ];
  for(const testProof of invalid)assert.equal(stripePaymentMatches(donation(),testProof),false);
  assert.equal(stripePaymentMatches(donation({paidAt:new Date()}),proof()),false);
  assert.equal(stripePaymentMatches(donation({provider:"PAYFOR"}),proof()),false);
  assert.equal(stripePaymentMatches(donation({status:"FAILED"}),proof()),false);
  assert.equal(stripePaymentMatches(donation({subscriptionId:base.id}),proof()),false);
  assert.equal(stripePaymentMatches(donation({totalAmount:50.255}),proof()),false);
});

test("signed recurring invoice proof rejects amount, currency, order, owner and non-paid invoices",()=>{
  const sub={id:"507f191e810c19729de860e9",donorId:base.donorId,payforToken:"sub_synthetic_123",
    amount:50.25,teamSupport:0,coverFees:false,currency:"USD"};
  const invoice={id:"in_synthetic_123",status:"paid",paid:true,currency:"usd",amount_paid:5025,amount_due:5025};
  assert.equal(stripeRecurringInvoiceMatches(sub,invoice,"sub_synthetic_123"),true);
  assert.equal(stripeRecurringInvoiceMatches(sub,{...invoice,amount_paid:5024},"sub_synthetic_123"),false);
  assert.equal(stripeRecurringInvoiceMatches(sub,{...invoice,amount_due:5024},"sub_synthetic_123"),false);
  assert.equal(stripeRecurringInvoiceMatches(sub,{...invoice,currency:"eur"},"sub_synthetic_123"),false);
  assert.equal(stripeRecurringInvoiceMatches(sub,{...invoice,status:"open"},"sub_synthetic_123"),false);
  assert.equal(stripeRecurringInvoiceMatches(sub,{...invoice,paid:false},"sub_synthetic_123"),false);
  assert.equal(stripeRecurringInvoiceMatches(sub,{...invoice,id:"in_other"},"sub_wrong"),false);
  assert.equal(stripeRecurringInvoiceMatches({...sub,donorId:""} as typeof sub,invoice,"sub_synthetic_123"),false);
});
