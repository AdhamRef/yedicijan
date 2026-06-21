import { createFallbackOperationsOverview } from "./mock-data";
import type { OperationsOverview } from "./types";

function getInternalBaseUrl(): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function getOperationsOverview(): Promise<OperationsOverview> {
  const fallbackOverview = createFallbackOperationsOverview();

  try {
    const response = await fetch(`${getInternalBaseUrl()}/api/dashboard/operations/overview`, {
      cache: "no-store",
    });

    if (!response.ok) return fallbackOverview;
    return (await response.json()) as OperationsOverview;
  } catch {
    return fallbackOverview;
  }
}
