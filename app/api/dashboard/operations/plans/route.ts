import { NextResponse } from "next/server";

const plans = [
  { id: "ramadan-2027", title: "رمضان 2027", theme: "زكاة، إفطار، وصدقة يومية", status: "PLANNING", items: 18, published: 0, date: "مارس 2027" },
  { id: "dhul-hijjah", title: "عشر ذي الحجة", theme: "أضاحي، وقف، ورسائل تذكير", status: "PLANNING", items: 12, published: 0, date: "يونيو 2027" },
  { id: "aqsa-waqf", title: "حملة الوقف للقدس", theme: "محتوى توعوي + شهادات وقف", status: "ACTIVE", items: 9, published: 3, date: "مستمرة" },
];

export async function GET() {
  return NextResponse.json({ source: "mock", count: plans.length, plans });
}
