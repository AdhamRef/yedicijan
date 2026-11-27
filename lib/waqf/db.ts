/**
 * Database access for the waqf funds page: the two new collections WaqfPageSettings and
 * WaqfFund (prisma/schema.prisma). Nothing here touches donations, payments or any other table.
 * Typed narrowly so this compiles before `prisma generate` has seen the new models.
 */
import { prisma } from "@/lib/prisma";
import { DEFAULT_SETTINGS, toFundDTO, toSettingsDTO, type FundInput, type WaqfFundDTO, type WaqfSettingsDTO } from "./config";

type Row = Record<string, unknown> & { id: string };
type Delegate = {
  findMany(args?: unknown): Promise<Row[]>;
  findFirst(args?: unknown): Promise<Row | null>;
  create(args: unknown): Promise<Row>;
  update(args: unknown): Promise<Row>;
  delete(args: unknown): Promise<Row>;
  count(args?: unknown): Promise<number>;
};
const db = prisma as unknown as { waqfFund: Delegate; waqfPageSettings: Delegate };

export async function readSettings(): Promise<WaqfSettingsDTO> {
  const row = await db.waqfPageSettings.findFirst({ orderBy: { createdAt: "asc" } });
  return toSettingsDTO(row);
}

export async function saveSettings(s: WaqfSettingsDTO): Promise<WaqfSettingsDTO> {
  const row = await db.waqfPageSettings.findFirst({ orderBy: { createdAt: "asc" } });
  const saved = row
    ? await db.waqfPageSettings.update({ where: { id: row.id }, data: s })
    : await db.waqfPageSettings.create({ data: { ...DEFAULT_SETTINGS, ...s } });
  return toSettingsDTO(saved);
}

export async function listFunds(opts: { activeOnly?: boolean } = {}): Promise<WaqfFundDTO[]> {
  const rows = await db.waqfFund.findMany({
    where: opts.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toFundDTO);
}

export async function createFund(f: FundInput): Promise<WaqfFundDTO> {
  const order = await db.waqfFund.count();
  return toFundDTO(await db.waqfFund.create({ data: { ...f, order } }));
}

export async function updateFund(id: string, f: FundInput): Promise<WaqfFundDTO | null> {
  const row = await db.waqfFund.findFirst({ where: { id } });
  if (!row) return null;
  return toFundDTO(await db.waqfFund.update({ where: { id }, data: f }));
}

export async function deleteFund(id: string): Promise<boolean> {
  const row = await db.waqfFund.findFirst({ where: { id } });
  if (!row) return false;
  await db.waqfFund.delete({ where: { id } });
  return true;
}

export async function reorderFunds(ids: string[]): Promise<void> {
  for (let i = 0; i < ids.length; i++) {
    await db.waqfFund.update({ where: { id: ids[i] }, data: { order: i } });
  }
}

export async function countFunds(): Promise<number> {
  return db.waqfFund.count();
}
