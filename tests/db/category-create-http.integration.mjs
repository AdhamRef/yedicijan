import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const database = process.env.DATABASE_URL || "";
const base = "http://127.0.0.1:3108";
if (
  process.env.CI_MONGO_ISOLATED !== "1" ||
  !/^mongodb:\/\/127\.0\.0\.1:27017\/yedi_ci_[a-z_]+\?/.test(database) ||
  process.env.NEXTAUTH_URL !== base
) throw new Error("Refusing non-isolated category HTTP acceptance");

const prisma = new PrismaClient();
const nonce = randomBytes(5).toString("hex");
const users = {};
const created = [];

async function sessionCookie(user) {
  const token = await encode({
    token: { sub: user.id, email: user.email, name: user.name },
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 3600,
  });
  return "next-auth.session-token=" + encodeURIComponent(token);
}
async function api(path, method = "GET", payload, cookie) {
  const response = await fetch(base + path, {
    method,
    headers: {
      ...(payload ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
    },
    body: payload ? JSON.stringify(payload) : undefined,
    redirect: "manual",
  });
  const raw = await response.text();
  let body = null;
  try { body = JSON.parse(raw); } catch {}
  return { status: response.status, body, raw: raw.slice(0, 1200) };
}
function validPayload(name) {
  return {
    name,
    description: "اختبار HTTP معزول",
    translations: Object.fromEntries(
      ["en", "fr", "tr", "id", "pt", "es", "de"].map(loc => [
        loc,
        { name: "http-" + nonce + "-" + loc, description: "test-" + loc },
      ])
    ),
  };
}
async function ready() {
  for (let i = 0; i < 90; i++) {
    try {
      const result = await fetch(base + "/api/categories?limit=1");
      if (result.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Next.js server did not serve category GET. Inspect /tmp/yedi-category-http-server.log");
}
before(async () => {
  await ready();
  for (const [key, role, dashboardPermissions] of [
    ["admin", "ADMIN", []],
    ["staff", "STAFF", []],
    ["editor", "STAFF", ["categories"]],
    ["donor", "DONOR", []],
  ]) {
    users[key] = await prisma.user.create({
      data: { name: key, email: key + "-" + nonce + "@example.invalid", role, dashboardPermissions },
    });
  }
});
test("HTTP POST rejects missing login and unrelated role/permission", async () => {
  const payload = validPayload("permission check " + nonce);
  const a = await api("/api/categories", "POST", payload);
  assert.equal(a.status, 401, JSON.stringify(a));
  for (const role of ["staff", "donor"]) {
    const result = await api("/api/categories", "POST", payload, await sessionCookie(users[role]));
    assert.equal(result.status, 403, JSON.stringify(result));
  }
  assert.equal(await prisma.category.count({ where: { name: payload.name } }), 0);
});
test("HTTP POST validates required English and Arabic names before writes", async () => {
  const cookie = await sessionCookie(users.admin);
  const payload = validPayload("invalid " + nonce);
  delete payload.translations.en;
  let result = await api("/api/categories", "POST", payload, cookie);
  assert.equal(result.status, 400, JSON.stringify(result));
  payload.translations.en = { name: "valid" };
  payload.name = "";
  result = await api("/api/categories", "POST", payload, cookie);
  assert.equal(result.status, 400, JSON.stringify(result));
});
test("HTTP POST creates category with 8 locales; duplicate returns 409; PUT and PATCH persist", async () => {
  const cookie = await sessionCookie(users.editor);
  const name = "HTTP category " + nonce;
  const payload = validPayload(name);
  const create = await api("/api/categories", "POST", payload, cookie);
  assert.equal(create.status, 201, JSON.stringify(create));
  const id = create.body?.id;
  assert.match(id, /^[a-f\d]{24}$/i);
  created.push(id);
  assert.equal(create.body.translations.length, 7);
  const dupe = await api("/api/categories", "POST", { ...payload, translations: { en: { name: "other-" + nonce } } }, cookie);
  assert.equal(dupe.status, 409, JSON.stringify(dupe));
  const edited = { ...payload, name: name + " edited", description: "after update", order: 8 };
  edited.translations.tr = { name: "updated-tr-" + nonce, description: "edit" };
  const update = await api("/api/categories/" + id, "PUT", edited, cookie);
  assert.equal(update.status, 200, JSON.stringify(update));
  const inactive = await api("/api/categories/" + id, "PATCH", { isActive: false }, cookie);
  assert.equal(inactive.status, 200, JSON.stringify(inactive));
  const active = await api("/api/categories/" + id, "PATCH", { isActive: true }, cookie);
  assert.equal(active.status, 200, JSON.stringify(active));
  for (const locale of ["ar", "en", "fr", "tr", "id", "pt", "es", "de"]) {
    const result = await api("/api/categories/" + id + "?locale=" + locale);
    assert.equal(result.status, 200, JSON.stringify({ locale, result }));
    assert.ok(result.body?.name, locale);
  }
  const db = await prisma.category.findUnique({ where: { id }, include: { translations: true } });
  assert.equal(db?.description, "after update");
  assert.equal(db?.order, 8);
  assert.equal(db?.isActive, true);
  assert.equal(db?.translations?.find(row => row.locale === "tr")?.name, "updated-tr-" + nonce);
});
after(async () => {
  for (const id of created) {
    await prisma.categoryTranslation.deleteMany({ where: { categoryId: id } });
    await prisma.category.deleteMany({ where: { id } });
  }
  for (const user of Object.values(users)) await prisma.user.deleteMany({ where: { id: user.id } });
  await prisma.$disconnect();
});
