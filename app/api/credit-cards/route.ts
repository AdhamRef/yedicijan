import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { decryptCard } from "@/lib/card-crypto";

// GET /api/credit-cards — list user's saved cards (masked)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const cards = await prisma.creditCard.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });

  const masked = cards.map((c) => {
    let last4 = "****";
    try {
      const plain = decryptCard(c.cardNumber);
      last4 = plain.replace(/\s/g, "").slice(-4);
    } catch {}
    return {
      id: c.id,
      last4,
      cardType: c.cardType,
      expiryDate: c.expiryDate,
      cardholderName: c.cardholderName,
      isDefault: c.isDefault,
      nickname: c.nickname,
      createdAt: c.createdAt,
    };
  });

  return NextResponse.json({ cards: masked });
}

// New card storage is disabled. Retaining encrypted PAN/CVC in app databases
// requires independently validated PCI scope and a bank-approved tokenization
// provider. Do not re-enable without a reviewed replacement workflow.
export async function POST() {
  return NextResponse.json(
    { error: "Card vault disabled; use a bank-approved tokenized payment method." },
    { status: 403 }
  );
}
