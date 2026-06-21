import { NextResponse } from "next/server";

const items = [
  { id: "daily-ramadan", title: "فكرة سلسلة رمضان اليومية", type: "IDEA", status: "IDEA", channel: "All Channels", due: "هذا الشهر" },
  { id: "zakat-carousel", title: "كاروسيل: كيف تحسب زكاتك؟", type: "CAROUSEL", status: "WRITING", channel: "Instagram", due: "هذا الأسبوع" },
  { id: "gaza-design", title: "تصميم حملة غزة العاجلة", type: "DESIGN", status: "DESIGN", channel: "Meta Ads", due: "غدًا" },
  { id: "waqf-video", title: "فيديو تعريفي عن الوقف", type: "VIDEO", status: "REVIEW", channel: "YouTube / Reels", due: "الأسبوع القادم" },
  { id: "friday-whatsapp", title: "رسالة واتساب للجمعة", type: "WHATSAPP", status: "APPROVED", channel: "WhatsApp", due: "الجمعة" },
];

export async function GET() {
  return NextResponse.json({ source: "mock", count: items.length, items });
}
