import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { rawCountDeliveries, rawCountProviderEvents, rawFindDeliveries, rawGroupByDeliveries } from "@/lib/communication/delivery-raw-query";

/**
 * The communication dashboards' queries, run index-friendly (Minber al-Aqsa #255) with a safety net:
 * if the raw path fails for any reason (including a filter it does not translate), the original Prisma
 * query runs instead — slower but identical — so a dashboard never breaks over speed.
 */
function fallback<T>(label: string, fast: () => Promise<T>, slow: () => Promise<T>): Promise<T> {
  return fast().catch((error) => {
    console.warn(`[delivery-fast-query] ${label}: using Prisma`, error instanceof Error ? error.message : error);
    return slow();
  });
}

export const fastCountDeliveries = (args: { where?: Prisma.CommunicationDeliveryWhereInput }) =>
  fallback("count", () => rawCountDeliveries(args), () => prisma.communicationDelivery.count(args));

export const fastCountProviderEvents = (args: { where?: Prisma.CommunicationProviderEventWhereInput } = {}) =>
  fallback("events", () => rawCountProviderEvents(args), () => prisma.communicationProviderEvent.count(args));

export function fastGroupByDeliveries(args: { by: ["status"] | ["templateName"]; where?: Prisma.CommunicationDeliveryWhereInput; _count: { _all: true } }) {
  return fallback("groupBy", () => rawGroupByDeliveries(args), async () =>
    (await prisma.communicationDelivery.groupBy({ by: args.by, where: args.where, _count: { _all: true } })) as unknown as Awaited<ReturnType<typeof rawGroupByDeliveries>>);
}

export function fastFindDeliveries(args: Parameters<typeof rawFindDeliveries>[0]) {
  return fallback("findMany", () => rawFindDeliveries(args), () =>
    prisma.communicationDelivery.findMany(args as Prisma.CommunicationDeliveryFindManyArgs) as Promise<Awaited<ReturnType<typeof rawFindDeliveries>>>);
}
