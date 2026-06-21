import { NextResponse } from "next/server";

const tasks = [
  { id: "task-waqf-script", title: "كتابة نص فيديو الوقف", owner: "فريق المحتوى", status: "IN_PROGRESS", due: "12 يونيو", item: "فيديو تعريفي عن الوقف" },
  { id: "task-zakat-design", title: "تصميم كاروسيل الزكاة", owner: "فريق التصميم", status: "REVIEW", due: "13 يونيو", item: "كاروسيل: كيف تحسب زكاتك؟" },
  { id: "task-gaza-edit", title: "مونتاج فيديو غزة", owner: "فريق الميديا", status: "DESIGN", due: "14 يونيو", item: "تصميم حملة غزة العاجلة" },
  { id: "task-friday-whatsapp", title: "تجهيز رسالة واتساب الجمعة", owner: "التسويق", status: "APPROVED", due: "الجمعة", item: "رسالة واتساب للجمعة" }
];

export async function GET() {
  return NextResponse.json({ source: "mock", count: tasks.length, tasks });
}
