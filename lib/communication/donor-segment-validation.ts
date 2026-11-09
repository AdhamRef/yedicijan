import { z } from "zod";

/**
 * YediCihan donor segments reuse the existing CommunicationAudienceList and
 * CommunicationAudienceMember models. This package creates no donors, sends
 * no messages, and does not modify the locale catalog.
 */
export const createDonorSegmentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().default(""),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  donorIds: z.array(z.string().regex(/^[a-f\d]{24}$/i)).min(1).max(100),
}).strict();

export type CreateDonorSegmentInput = z.infer<typeof createDonorSegmentSchema>;

export function validateDonorSelection(input: unknown) {
  const parsed = createDonorSegmentSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "بيانات القائمة غير صحيحة" };
  const donorIds = [...new Set(parsed.data.donorIds)];
  return { ok: true as const, value: { ...parsed.data, donorIds } };
}
