// Batch 2 (Minber port): guest donation view, dashboard donations search, live refresh.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { guestDonationView, GUEST_DONATION_FIELDS } from "../lib/donations/guest-view";

const read = (p: string) => readFileSync(join(__dirname, "..", p), "utf8");

test("a guest gets amounts, status, projects and the donor's id/name only", () => {
  const v = guestDonationView({
    id: "d1", amount: 10, totalAmount: 11, currency: "USD", status: "PAID", paidAt: "x", items: [{ id: "i" }], categoryItems: [],
    providerProcReturnCode: "00", providerErrorMessage: null, donorId: "u1",
    donor: { id: "u1", name: "Ali", email: "a@b.c", phone: "+90", birthdate: "2000", city: "X" },
    attribution: { fbclid: "z" }, providerAuthCode: "A1", providerHostRefNum: "R", providerOrderId: "O", comment: "c", donorCountryCode: "TR",
  });
  assert.deepEqual(v.donor, { id: "u1", name: "Ali" });
  for (const k of ["attribution", "providerAuthCode", "providerHostRefNum", "providerOrderId", "comment", "donorCountryCode", "providerRaw", "cardDetails"]) {
    assert.ok(!(k in v), k);
  }
  assert.equal(v.totalAmount, 11);
  assert.deepEqual(v.items, [{ id: "i" }]);
});

test("the success, failed and polling readers find their fields in the guest view", () => {
  const fields = new Set<string>(GUEST_DONATION_FIELDS);
  for (const f of ["status", "paidAt", "amount", "totalAmount", "teamSupport", "fees", "coverFees", "currency", "items", "categoryItems", "createdAt", "id", "provider", "providerTxnResult", "providerProcReturnCode", "providerErrorMessage"]) {
    assert.ok(fields.has(f), f);
  }
});

test("GET /api/donations/[id]: id checked, no-store, raw bank payload never sent, guests reduced", () => {
  const r = read("app/api/donations/[id]/route.ts");
  assert.match(r, /!\/\^\[a-f\\d\]\{24\}\$\/i\.test\(id\)/);
  assert.match(r, /'Cache-Control': 'private, no-store'/);
  assert.match(r, /const \{ providerRaw: _raw, \.\.\.safe \} = donation;/);
  assert.match(r, /if \(!fullAccess\) \{\n\s+return NextResponse\.json\(guestDonationView\(response\)/);
});

test("dashboard donations: server search, no double paging, partial bulk delete", () => {
  const p = read("app/(dashboard)/dashboard/donations/page.tsx");
  assert.match(p, /\.\.\.\(debouncedSearch \? \{ search: debouncedSearch \} : \{\}\)/);
  assert.match(p, /const paginatedDonations = filteredDonations;/);
  assert.match(p, /Promise\.allSettled/);
  assert.doesNotMatch(p, /item\.campaign\.title\.toLowerCase\(\)\.includes\(searchQuery/);
});

test("dashboard home: latest donations refresh live on page one", () => {
  const p = read("app/(dashboard)/dashboard/page.tsx");
  assert.match(p, /useLiveDonationRefresh\(\(\) => fetchDonations\(1, false, true\), !loading && donationsPage === 1\)/);
});
