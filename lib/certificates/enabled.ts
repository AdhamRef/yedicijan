import { NextResponse } from "next/server";

/**
 * Donor documents (thank-you certificate, receipt, waqf and gift certificates).
 *
 * The templates in `components/minbar/certificates` still carry the artwork of
 * the codebase they came from (logo, seal, director's stamp under
 * `public/minbar/assets`), so Yedicihan issues none until its own artwork is in
 * place. Set `DONOR_DOCUMENTS_ENABLED=1` once it is.
 */
export function donorDocumentsEnabled(): boolean {
  return process.env.DONOR_DOCUMENTS_ENABLED === "1";
}

export function documentsDisabledResponse() {
  return NextResponse.json({ error: "Documents are not available" }, { status: 404 });
}
