import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import {
  decodeMessageBodySubject,
  isMessageSubject,
  type MessageSubject,
} from "@/lib/messages/subjects";

// GET /api/admin/messages - List messages (admin only) with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const denied = requireAdminOrDashboardPermission(session, "messages");
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || undefined; // ar, en, fr
    const search = searchParams.get("search")?.trim() || undefined;
    const hasUser = searchParams.get("hasUser"); // "true" | "false" | omit
    const subject = searchParams.get("subject") || "all";
    const sortBy = (searchParams.get("sortBy") || "createdAt") as "createdAt" | "body";
    const sortOrder = (searchParams.get("sortOrder") || "desc") as "asc" | "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    const andClauses: Record<string, unknown>[] = [];
    if (locale) where.locale = locale;
    if (search && search.length > 0) {
      andClauses.push({ body: { contains: search } });
    }
    if (subject !== "all" && isMessageSubject(subject)) {
      if (subject === "GENERAL") {
        andClauses.push({
          OR: [
            { subject: "GENERAL" },
            { subject: null },
            { body: { not: { contains: "[SUBJECT:" } } },
          ],
        });
      } else {
        andClauses.push({
          OR: [
            { subject: subject as MessageSubject },
            { body: { contains: `[SUBJECT:${subject}]` } },
          ],
        });
      }
    }
    if (andClauses.length > 0) where.AND = andClauses;
    if (hasUser === "true") where.userId = { not: null };
    if (hasUser === "false") where.userId = null;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
      }),
      prisma.message.count({ where }),
    ]);

    const normalized = messages.map((m) => {
      const decoded = decodeMessageBodySubject(m.body);
      return {
        ...m,
        body: decoded.body,
        subject: isMessageSubject(m.subject) ? m.subject : decoded.subject,
      };
    });

    return NextResponse.json({
      messages: normalized,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("Error listing messages:", err);
    return NextResponse.json(
      { error: "Failed to load messages" },
      { status: 500 }
    );
  }
}
