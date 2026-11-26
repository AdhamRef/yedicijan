import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

/*
 * WhatsApp conversations, ported from Minber al-Aqsa (#256, #258, #261, #265, #269, #274, #289) and adapted to
 * Yedicihan: a new section beside the contact-form inbox, text-only replies, Yedicihan's sender and template code.
 */
const read = (p: string) => fs.readFileSync(p, "utf8");
const ui = read("app/(dashboard)/dashboard/communication/conversations/_components/ConversationsWorkspace.tsx");
const page = read("app/(dashboard)/dashboard/communication/conversations/page.tsx");
const staff = read("app/api/dashboard/communication/inbox/conversations/staff/route.ts");
const one = read("app/api/dashboard/communication/inbox/[id]/route.ts");
const layout = read("app/(dashboard)/dashboard/DashboardLayoutClient.tsx");
const alerts = read("lib/communication/inbox-alerts.ts");
const quick = read("app/api/dashboard/communication/inbox/quick-replies/route.ts");
const reply = read("lib/communication/conversation-reply-service.ts");
const tplSvc = read("lib/communication/conversation-template-service.ts");
const nav = read("lib/dashboard/nav-config.ts");

test("a new section: the contact-form inbox stays as it is", () => {
  assert.match(nav, /href: "\/dashboard\/inbox", icon: "inbox"[^\n]*badge: "inboxUnread"/, "contact-form inbox keeps its entry and badge");
  assert.match(nav, /title: "محادثات واتساب", href: "\/dashboard\/communication\/conversations"[^\n]*badge: "whatsappUnread"/);
  assert.ok(fs.existsSync("app/(dashboard)/dashboard/inbox/page.tsx"));
  assert.ok(!fs.existsSync("app/(dashboard)/dashboard/communication/inbox/page.tsx"), "no Minber redirect page over the old inbox");
});

test("the page and every API use the messages permission", () => {
  assert.match(page, /resolveDashboardPageAccess\(session, "messages"\)/);
  for (const [name, src, n] of [["[id]", one, 2], ["staff", staff, 1], ["quick-replies", quick, 1], ["templates", read("app/api/dashboard/communication/inbox/templates/route.ts"), 1]] as const)
    assert.equal((src.match(/requireAdminOrDashboardPermission\(session, "messages"\)/g) ?? []).length, n, name);
  assert.equal((quick.match(/const \{ (session, )?denied \} = await gate\(\);\n  if \(denied\) return denied;/g) ?? []).length, 3, "GET, POST and DELETE are gated");
  assert.match(staff, /userHasDashboardPermission\([^)]*"messages"\)/);
  assert.doesNotMatch(staff, /email: u\.email,|password/i, "only id and display name leave the server");
});

test("the workspace: four language tabs, views, assignment, done, text-only replies", () => {
  for (const k of ['key: "ar"', 'key: "tr"', 'key: "fr"', 'key: "en"']) assert.ok(ui.includes(k), k);
  for (const v of ['"all"', '"mine"', '"unread"', '"done"']) assert.ok(ui.includes(v), v);
  assert.match(ui, /fetch\(`\$\{API\}\/conversations\?\$\{p\}`/);
  assert.match(ui, /method: "PATCH"[\s\S]*?read: true/);
  assert.match(ui, /patch\(\{ assignToMe: true \}\)/);
  assert.match(ui, /status: active\.status === "DONE" \? "OPEN" : "DONE"/);
  assert.match(ui, /JSON\.stringify\(\{ action: "reply", body: draft\.trim\(\) \}\)/);
  assert.match(ui, /REPLY_WINDOW_CLOSED/);
  assert.doesNotMatch(ui, /\/media|InboxAttachments|InboxMedia|recording/, "Minber's attachments and voice notes are not part of Yedicihan");
  assert.doesNotMatch(ui, /منبر|minbar/i, "no Minber name or asset path on screen");
});

test("phone layout (#289): the tools fold away, Safari's visible height, 16 px text box", () => {
  assert.match(ui, /\$\{showTools \? "flex" : "hidden"\} w-full flex-wrap items-center gap-2 md:flex md:w-auto/);
  assert.match(ui, /h-\[calc\(100dvh-7rem\)\]/);
  assert.match(ui, /text-base outline-none md:text-sm/);
});

test("alerts (#265): only when the unread total grows; background tab keeps checking; title shows the count", () => {
  assert.match(alerts, /if \(previous === null \|\| next <= previous \|\| !inboxAlertsEnabled\(\)\) return;/);
  assert.match(alerts, /document\.hidden\)/, "browser notification only for a background tab");
  assert.match(alerts, /const PREF_KEY = "yedicihan-inbox-alerts";/);
  assert.match(alerts, /icon: "\/logo\.png"/, "Yedicihan's own logo");
  assert.match(layout, /alertOnNewInboxMessages\(last, next,/);
  assert.match(layout, /document\.hidden && !inboxAlertsEnabled\(\)/);
  assert.match(layout, /setInboxTitleCount\(whatsappUnread\)/);
  assert.match(layout, /const wantsWhatsappBadge = badgeKeys\.includes\('whatsappUnread'\);\r?\n  useEffect\(\(\) => \{\r?\n    if \(!wantsWhatsappBadge\) return;/, "polled only for people who see the entry");
  assert.match(ui, /setInboxAlertsEnabled\(v\)/);
  assert.match(ui, /requestNotificationPermission\(\)/);
});

test("quick replies (#265): validated, per language, inserted into the draft", () => {
  assert.match(quick, /title\.length > 60 \|\| body\.length > 1000/);
  assert.match(quick, /language: \{ \$in: \[lang, "all"\] \}/);
  assert.match(ui, /onClick=\{\(\) => \{ setDraft\(r\.body\); setShowQuick\(false\); \}\}/);
});

test("replies: do-not-contact first, then the 24-hour window, then the send; archived as MANUAL", () => {
  const fn = reply.slice(reply.indexOf("export async function conversationSender"));
  assert.ok(fn.indexOf("doNotContact: true") > 0 && fn.indexOf("doNotContact: true") < fn.indexOf("getActiveMetaWhatsappRuntimeConfig()"), "do-not-contact before anything else");
  assert.match(reply, /if \(policyUnavailable\) return \{ ok: false, reason: "CONTACT_POLICY_UNAVAILABLE" \};/, "an unreadable policy blocks the send");
  const send = reply.slice(reply.indexOf("export async function sendConversationReply"));
  assert.ok(send.indexOf("replyWindowFor(") < send.indexOf("createDeliveryRecord("), "window checked before anything is archived or sent");
  assert.match(send, /return \{ ok: false, reason: "REPLY_WINDOW_CLOSED"/);
  assert.match(send, /origin: "MANUAL"/);
  assert.match(reply, /if \(!known\) return \{ ok: false, reason: "CONVERSATION_SENDER_NOT_FOUND" \};/, "never falls back to another number");
  assert.match(read("lib/communication/providers/meta-whatsapp/messages.ts"), /type: "text",\r?\n    text: \{ body: input\.body, preview_url: false \},/);
});

test("templates (#269): offered only after the window; Yedicihan's opt-in rule for marketing; no guessed values", () => {
  assert.match(ui, /replyWindow && !replyWindow\.open \? \([\s\S]*?dt\("إرسال قالب معتمد"\)/);
  assert.match(ui, /window\.confirm\(dt\("إرسال القالب «\{0\}» إلى \{1\}؟"/);
  assert.match(one, /await import\("@\/lib\/communication\/conversation-template-service"\)/);
  assert.match(tplSvc, /if \(templateNeedsData\(tpl\)\) return \{ ok: false, reason: "TEMPLATE_NEEDS_DATA" \};/);
  assert.match(tplSvc, /if \(isMarketing\(tpl\) && !\(await marketingAllowed\(sender\.to\)\)\) return \{ ok: false, reason: "MARKETING_OPTED_OUT" \};/);
  assert.match(tplSvc, /rows\.some\(\(row\) => row\.whatsappOptIn && !row\.doNotContact\)/, "marketing only to opted-in numbers");
  assert.match(tplSvc, /if \(rows === null\) return false;/, "an unreadable profile counts as not opted in");
  assert.match(tplSvc, /origin: "MANUAL"/);
});

test("templateNeedsData: variables or a media header need values a conversation does not have", () => {
  const js = ts.transpileModule(tplSvc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const mod: { exports: Record<string, unknown> } = { exports: {} };
  vm.runInNewContext(js, { module: mod, exports: mod.exports, String, Number, Object, require: () => ({}) });
  const needs = mod.exports.templateNeedsData as (t: { body?: string | null; header?: unknown }) => boolean;
  assert.equal(needs({ body: "شكراً لتواصلكم معنا" }), false);
  assert.equal(needs({ body: "مرحباً {{1}}" }), true);
  assert.equal(needs({ body: "Hi {{ user.name }}" }), true);
  assert.equal(needs({ body: "ok", header: { type: "text", text: "Yedicihan" } }), false);
  assert.equal(needs({ body: "ok", header: { type: "text", text: "{{1}}" } }), true);
  assert.equal(needs({ body: "ok", header: { type: "image", mediaUrl: "x" } }), true);
});

test("the donor's profile opens their conversation (#274), and the page finds it by phone", () => {
  const dlg = read("components/dashboard/ViewUserProfileDialog.tsx");
  assert.match(dlg, /\/dashboard\/communication\/conversations\?phone=\$\{encodeURIComponent\(user\.phone\)\}/);
  assert.match(dlg, /canOpenConversations && user\.phone &&/);
  assert.match(ui, /new URLSearchParams\(window\.location\.search\)\.get\("phone"\)/);
  assert.match(ui, /if \(hit\) \{ setActiveId\(hit\.id\); setWantedPhone\(""\); \}/);
});

test("the timeline shows the newest messages and media as their type", () => {
  const svc = read("lib/communication/conversation-service.ts");
  assert.match(svc, /orderBy: \{ receivedAt: "desc" \}, take: 300/);
  assert.match(svc, /orderBy: \{ createdAt: "desc" \}, take: 300/);
  assert.match(svc, /timeline\.sort\(\(a, b\) => \(a\.at \?\? ""\)\.localeCompare\(b\.at \?\? ""\)\);/);
  assert.match(svc, /`\[\$\{p\.messageType\}\]`/);
});
