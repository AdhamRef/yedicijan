import test, { after, before } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { chromium } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { encode } from "next-auth/jwt";

const URL = process.env.DATABASE_URL || "";
const SITE = "http://127.0.0.1:3110";
if (process.env.CI_MONGO_ISOLATED !== "1" ||
    !/^mongodb:\/\/127\.0\.0\.1:27017\/yedi_ci_[a-z_]+\?/.test(URL) ||
    process.env.NEXTAUTH_URL !== SITE) {
  throw new Error("Refusing browser E2E outside isolated local MongoDB");
}
const prisma = new PrismaClient();
const nonce = randomBytes(5).toString("hex");
const title = "حملة تجريبية " + nonce;
let browser, context, admin, categoryId;
const localeNames = {
  en: "English-" + nonce, fr: "French-" + nonce,
  tr: "Turkish-" + nonce, id: "Indonesian-" + nonce,
  pt: "Portuguese-" + nonce, es: "Spanish-" + nonce,
  de: "German-" + nonce,
};
async function waitForServer() {
  for (let i = 0; i < 90; i++) {
    try { if ((await fetch(SITE + "/api/categories?limit=1")).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error("Next server unavailable");
}
before(async () => {
  await waitForServer();
  admin = await prisma.user.create({ data: {
    name: "Synthetic E2E Admin",
    email: "category-e2e-" + nonce + "@example.invalid",
    role: "ADMIN",
  }});
  const token = await encode({
    token: { sub: admin.id, email: admin.email, name: admin.name, role: "ADMIN" },
    secret: process.env.NEXTAUTH_SECRET,
    maxAge: 3600,
  });
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addCookies([{
    name: "next-auth.session-token", value: token,
    url: SITE, httpOnly: true, sameSite: "Lax",
  }]);
});
test("actual dashboard browser creates, edits, archives, publishes eight-locale category", async () => {
  const page = await context.newPage();
  const jsErrors = [];
  page.on("pageerror", error => jsErrors.push(error.message));
  await page.goto(SITE + "/dashboard/categories/new", { waitUntil: "domcontentloaded" });
  await assert.doesNotReject(() => page.getByRole("heading", { name: /إنشاء حملة جديدة/ }).waitFor({ timeout: 20000 }));
  await page.getByPlaceholder("أدخل اسم الحملة").fill(title);
  for (const [locale, name] of Object.entries(localeNames)) {
    const tab = { en: "English", fr: "Français", tr: "Türkçe", id: "Bahasa",
      pt: "Português", es: "Español", de: "Deutsch" }[locale];
    await page.getByRole("tab", { name: new RegExp(tab) }).click();
    const panel = page.getByRole("tabpanel");
    const input = panel.locator("input").first();
    await input.fill(name);
  }
  await page.getByRole("button", {name: "إنشاء الحملة"}).click();
  await page.waitForURL(/\/dashboard\/categories\/?$/, {timeout:20000});
  const db = await prisma.category.findFirst({where:{name:title},include:{translations:true}});
  assert.ok(db, "browser POST created category");
  categoryId=db.id;
  assert.equal(db.translations.length,7);
  const row=page.getByRole("row").filter({hasText:title});
  await row.waitFor({timeout:15000});
  await row.locator('button').filter({has:page.locator('svg.lucide-pencil')}).click();
  await page.waitForURL(/\/dashboard\/categories\/edit\//,{timeout:15000});
  await page.getByPlaceholder("أدخل اسم الحملة").fill(title + " محررة");
  await page.getByRole("button",{name:/حفظ|تحديث/}).last().click();
  await page.getByText("تم تحديث الحملة بنجاح").first().waitFor({timeout:15000});
  const persisted=await prisma.category.findUnique({where:{id:categoryId}});
  assert.equal(persisted?.name,title+" محررة");
  await page.goto(SITE+"/dashboard/categories");
  const editedRow=page.getByRole("row").filter({hasText:title+" محررة"});
  await editedRow.waitFor({timeout:15000});
  await editedRow.getByTitle("تعطيل الحملة وأرشفتها").click();
  await page.getByRole("alertdialog").getByRole("button",{name:/تعطيل|أرشفة|تأكيد/}).last().click();
  await page.waitForTimeout(900);
  assert.equal((await prisma.category.findUnique({where:{id:categoryId}}))?.isActive,false);
  await page.getByRole("button",{name:/أرشيف الحملات/}).click();
  await page.getByText(title+" محررة").first().waitFor({timeout:15000});
  await page.getByRole("dialog").getByRole("button",{name:"إعادة تفعيل"}).click();
  await page.getByRole("alertdialog").getByRole("button",{name:/تفعيل|نشر|تأكيد/}).last().click();
  await page.waitForFunction(async id => {
    const response=await fetch("/api/categories/"+id+"?allTranslations=true");
    if(!response.ok)return false;
    const data=await response.json();
    return data.isActive===true;
  },categoryId,{timeout:15000});
  assert.equal((await prisma.category.findUnique({where:{id:categoryId}}))?.isActive,true);
  await page.screenshot({path:"/tmp/yedi-category-browser.png",fullPage:true});
  assert.deepEqual(jsErrors,[],"no uncaught JS errors in actual browser");
  await page.close();
});
after(async()=>{
  if(browser) await browser.close();
  if(categoryId){
    await prisma.categoryTranslation.deleteMany({where:{categoryId}});
    await prisma.category.deleteMany({where:{id:categoryId}});
  }
  if(admin)await prisma.user.deleteMany({where:{id:admin.id}});
  await prisma.$disconnect();
});
