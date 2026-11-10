import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const uri = process.env.DATABASE_URL || "";
if (process.env.CI_MONGO_ISOLATED !== "1" ||
    !/^mongodb:\/\/127\.0\.0\.1:27017\/yedi_ci_[a-z_]+\?/.test(uri)) {
  throw new Error("Refusing database test outside explicitly isolated local CI MongoDB");
}

const prisma = new PrismaClient();
const newObjectId = () => randomBytes(12).toString("hex");

test("real isolated MongoDB: localized emergency banner CRUD, active filtering and default-off", async () => {
  let id;
  try {
    const created = await prisma.urgentBanner.create({
      data: {
        title: "مساعدة شتوية عاجلة",
        description: "بيانات اختبار اصطناعية",
        ctaLabel: "ساهم الآن",
        campaignId: newObjectId(),
        locales: ["ar", "tr"],
        translations: { create: [{ locale: "tr", title: "Acil kış yardımı", ctaLabel: "Bağış yap" }] },
      },
      include: { translations: true },
    });
    id = created.id;
    assert.equal(created.isActive, false);
    assert.deepEqual(created.locales, ["ar", "tr"]);
    assert.equal(created.translations.length, 1);

    const before = await prisma.urgentBanner.findMany({ where: { id, isActive: true } });
    assert.equal(before.length, 0);
    await prisma.urgentBanner.update({ where: { id }, data: { isActive: true, priority: 3 } });
    const after = await prisma.urgentBanner.findMany({
      where: { id, isActive: true }, include: { translations: true },
    });
    assert.equal(after.length, 1);
    assert.equal(after[0].priority, 3);
    assert.equal(after[0].translations[0].locale, "tr");
  } finally {
    if (id) await prisma.urgentBanner.delete({ where: { id } });
  }
});

test("real isolated MongoDB: CRM list and members persist, then archive without deleting donors", async () => {
  let listId;
  try {
    const list = await prisma.communicationAudienceList.create({
      data: { name: "قائمة اختبار غير إنتاجية", type: "CUSTOM", channels: ["EMAIL"] },
    });
    listId = list.id;
    assert.equal(list.status, "ACTIVE");
    const member = await prisma.communicationAudienceMember.create({
      data: { listId, contactType: "DONOR", userId: newObjectId(), status: "ACTIVE" },
    });
    assert.equal(member.listId, listId);
    const members = await prisma.communicationAudienceMember.findMany({
      where: { listId, status: "ACTIVE" },
    });
    assert.equal(members.length, 1);
    await prisma.communicationAudienceList.update({
      where: { id: listId }, data: { status: "ARCHIVED" },
    });
    const availableLists = await prisma.communicationAudienceList.findMany({
      where: { id: listId, status: "ACTIVE" },
    });
    assert.equal(availableLists.length, 0);
  } finally {
    if (listId) {
      await prisma.communicationAudienceMember.deleteMany({ where: { listId } });
      await prisma.communicationAudienceList.delete({ where: { id: listId } });
    }
  }
});

test.after(async () => {
  await prisma.$disconnect();
});
