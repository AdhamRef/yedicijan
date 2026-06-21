import { NextResponse } from "next/server";

const seasons = [
  { id: "ramadan", title: "رمضان", focus: "زكاة، إفطار، صدقة يومية", status: "PLANNING", period: "مارس 2027", required: 30, ready: 8, progress: 27 },
  { id: "dhul-hijjah", title: "عشر ذي الحجة", focus: "أضاحي، وقف، تذكير يومي", status: "PLANNING", period: "يونيو 2027", required: 18, ready: 4, progress: 22 },
  { id: "aqsa-waqf", title: "القدس والوقف", focus: "وقف، حماية المقدسات، تقارير أثر", status: "ACTIVE", period: "مستمرة", required: 16, ready: 7, progress: 44 },
  { id: "gaza", title: "غزة العاجلة", focus: "إغاثة، غذاء، فيديوهات ميدانية", status: "ACTIVE", period: "هذا الشهر", required: 12, ready: 5, progress: 42 },
  { id: "winter", title: "الشتاء", focus: "دفء، بطانيات، سلال غذائية", status: "UPCOMING", period: "نوفمبر", required: 10, ready: 1, progress: 10 },
];

export async function GET() {
  return NextResponse.json({ source: "mock", count: seasons.length, seasons });
}
