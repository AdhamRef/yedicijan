import { NextResponse } from "next/server";

// Legacy local PAN vault is not a supported payment method. Never decrypt
// stored PAN merely to populate checkout UI. Keep deletion/retention review
// separate from financial transactions.
export async function GET() {
  return NextResponse.json({ cards: [], disabled: true });
}

export async function POST() {
  return NextResponse.json(
    { error: "Card storage disabled until bank-approved tokenization is implemented." },
    { status: 403 },
  );
}
