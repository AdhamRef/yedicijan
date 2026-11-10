import test, { after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { parseCategoryCreatePayload } from "../../lib/campaign/category-create-payload";
import { generateUniqueSlug, generateUniqueLocaleSlug } from "../../lib/slug";

const url = process.env.DATABASE_URL || "";
if (
  process.env.CI_MONGO_ISOLATED !== "1" ||
  !/^mongodb:\/\/127\.0\.0\.1:27017\/yedi_ci_[a-z_]+\?/.test(url)
) {
  throw new Error("Refusing tests without the isolated loopback MongoDB CI contract");
}
const prisma = new PrismaClient();
const nonce = randomBytes(6).toString("hex");
const createdIds: string[] = [];

async function createUsingCategoryRouteTransaction(input: unknown, failWithinTransaction = false) {
  const payload = parseCategoryCreatePayload(input);
  const english = payload.translations.find(row => row.locale === "en");
  assert.ok(english);
  const slug = await generateUniqueSlug(prisma.category, payload.requestedSlug ?? english.name, { fallbackPrefix: "category" });
  const translations = await Promise.all(payload.translations.map(async t => ({
    locale: t.locale,
    name: t.name,
    description: t.description,
    slug: await generateUniqueLocaleSlug(prisma.categoryTranslation, t.requestedSlug ?? t.name, { locale: t.locale, fallbackPrefix: "category" }),
  })));
  const category = await prisma.$transaction(async tx => {
    const item = await tx.category.create({
      data: {
        name: payload.name,
        slug,
        description: payload.description,
        image: payload.image,
        icon: payload.icon,
        order: payload.order,
      }
    });
    if (failWithinTransaction) throw new Error("Synthetic translation failure");
    await tx.categoryTranslation.createMany({
      data: translations.map(({ locale, name, description, slug }) => ({
        categoryId: item.id,
        locale, name, description, slug,
      })),
    });
    return item;
  }, { maxWait: 10_000, timeout: 20_000 });
  createdIds.push(category.id);
  return category;
}

test("real isolated Mongo: create category and eight-locale readback", async () => {
  const name = "اختبار تصنيف " + nonce;
  const rows = Object.fromEntries(
    ["en", "fr", "tr", "id", "pt", "es", "de"].map(locale => [
      locale, { name: "category-" + nonce + "-" + locale, description: "description-" + locale }
    ])
  );
  const cat = await createUsingCategoryRouteTransaction({
    name,
    description: "بيانات اصطناعية",
    image: "https://example.org/synthetic-category.png",
    order: 3,
    translations: rows,
  });
  const persisted = await prisma.category.findUnique({
    where: { id: cat.id },
    include: { translations: true },
  });
  assert.equal(persisted?.name, name);
  assert.equal(persisted?.order, 3);
  assert.equal(persisted?.translations.length, 7);
  assert.deepEqual(
    persisted?.translations.map(t => t.locale).sort(),
    ["en", "fr", "tr", "id", "pt", "es", "de"].sort(),
  );
  assert.ok(persisted?.translations.every(t => Boolean(t.slug)));
  assert.equal(persisted?.image, "https://example.org/synthetic-category.png");
});

test("real isolated Mongo: duplicate Arabic category name fails atomically", async () => {
  const first = await prisma.category.findFirst({ where: { name: "اختبار تصنيف " + nonce } });
  assert.ok(first);
  await assert.rejects(() => createUsingCategoryRouteTransaction({
    name: first.name,
    translations: { en: { name: "distinct-" + nonce } },
  }), error => (error as { code?: string })?.code === "P2002");
  const matching = await prisma.category.findMany({ where: { name: first.name } });
  assert.equal(matching.length, 1);
});

test("real isolated Mongo: deliberate translation error rolls back category insert", async () => {
  const name = "rollback category " + nonce;
  await assert.rejects(
    () => createUsingCategoryRouteTransaction({
      name,
      translations: { en: { name: "rollback-" + nonce } },
    }, true),
    /Synthetic translation failure/
  );
  assert.equal(await prisma.category.count({ where: { name } }), 0);
});

after(async () => {
  for (const id of createdIds) {
    await prisma.categoryTranslation.deleteMany({ where: { categoryId: id } });
    await prisma.category.delete({ where: { id } });
  }
  await prisma.$disconnect();
});
