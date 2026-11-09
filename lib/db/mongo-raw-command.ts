import type { Prisma } from "@prisma/client";

/**
 * MongoDB's raw command API accepts Extended JSON, not arbitrary JS objects.
 * Reject unsupported values instead of passing unchecked records into Prisma.
 */
export function mongoRawObject(input: Record<string, unknown>): Prisma.InputJsonObject {
  const convert = (value: unknown, depth: number): Prisma.InputJsonValue | null => {
    if (depth > 50) throw new TypeError("MongoDB raw query nesting limit exceeded");
    if (value === null) return null;
    if (value instanceof Date) {
      if (!Number.isFinite(value.getTime())) throw new TypeError("Invalid Date");
      return { $date: value.toISOString() };
    }
    if (typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) throw new TypeError("Non-finite MongoDB raw number");
      return value;
    }
    if (Array.isArray(value)) return value.map((v) => convert(v, depth + 1));
    if (typeof value === "object" && value !== null) {
      if (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
        throw new TypeError("Only plain MongoDB raw query objects are supported");
      const out: Record<string, Prisma.InputJsonValue | null> = {};
      for (const [key, child] of Object.entries(value)) {
        if (key === "__proto__" || key === "constructor" || key === "prototype")
          throw new TypeError("Forbidden MongoDB query key");
        if (child !== undefined) out[key] = convert(child, depth + 1);
      }
      return out;
    }
    throw new TypeError("Unsupported MongoDB raw query value: " + typeof value);
  };
  return convert(input, 0) as Prisma.InputJsonObject;
}
