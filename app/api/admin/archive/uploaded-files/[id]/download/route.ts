import { get as getPrivateBlob } from "@vercel/blob";
import { metadataObject, numberField, stringField } from "@/lib/archive/uploaded-files";
import { prisma } from "@/lib/prisma";
import { requireArchiveApiAccess, requireArchiveUploadedFileListAccess } from "../../../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> | { id: string } };

export async function GET(_request: Request, context: Params) {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;

  const { id } = await Promise.resolve(context.params);
  const row = await prisma.auditLog.findUnique({ where: { id }, select: { id: true, metadata: true, action: true, entityType: true } });
  if (!row || row.action !== "archive.uploadedFile.create" || row.entityType !== "ArchiveUploadedFile") {
    return new Response("Not found", { status: 404 });
  }

  const metadata = metadataObject(row.metadata);
  if (stringField(metadata.category) === "DOCUMENTS") {
    const docsAccess = await requireArchiveUploadedFileListAccess("DOCUMENTS");
    if (docsAccess.denied) return docsAccess.denied;
  }

  const fileName = safeFileName(stringField(metadata.fileName) || stringField(metadata.title) || "archive-file");
  const mimeType = stringField(metadata.mimeType) || "application/octet-stream";
  const blobDownloadUrl = stringField(metadata.blobDownloadUrl) || stringField(metadata.blobUrl);

  if (stringField(metadata.storageMode) === "BLOB" && blobDownloadUrl) {
    return streamBlobFile(blobDownloadUrl, fileName, mimeType);
  }

  const base64 = await readStoredBase64(row.id, metadata);
  if (!base64) return new Response("Not found", { status: 404 });

  return fileResponse(Buffer.from(base64, "base64"), fileName, mimeType);
}

async function streamBlobFile(url: string, fileName: string, fallbackMimeType: string) {
  // Archive metadata must never become an arbitrary server-side fetch target.
  // Private Blob requires an authenticated SDK request; the bare URL is not public.
  let target: URL;
  try { target = new URL(url); }
  catch { return new Response("Not found", { status: 404 }); }
  if (target.protocol !== "https:" || target.username || target.password) {
    return new Response("Not found", { status: 404 });
  }
  if (target.hostname.endsWith(".private.blob.vercel-storage.com")) {
    try {
      const result = await getPrivateBlob(url, { access: "private" });
      if (result?.statusCode !== 200 || !result.stream)
        return new Response("Not found", { status: 404 });
      return new Response(result.stream, {
        headers: { ...downloadHeaders(fileName, result.blob.contentType || fallbackMimeType), "X-Content-Type-Options": "nosniff" },
      });
    } catch (error) {
      console.error("Private archive download failed", error instanceof Error ? error.name : "unknown");
      return new Response("Not found", { status: 404 });
    }
  }
  // Backward compatibility for previously stored *public* Vercel Blob files
  // only; do not expose or redirect to arbitrary hosts.
  if (!target.hostname.endsWith(".public.blob.vercel-storage.com")) {
    return new Response("Not found", { status: 404 });
  }
  const response = await fetch(url, { cache: "no-store", redirect: "error" }).catch(() => null);
  if (!response?.ok || !response.body) return new Response("Not found", { status: 404 });
  return new Response(response.body, {
    headers: { ...downloadHeaders(fileName, response.headers.get("Content-Type") || fallbackMimeType), "X-Content-Type-Options": "nosniff" },
  });
}

function fileResponse(bytes: Buffer, fileName: string, mimeType: string) {
  return new Response(bytes, { headers: downloadHeaders(fileName, mimeType) });
}

function downloadHeaders(fileName: string, mimeType: string) {
  return {
    "Content-Type": mimeType,
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    "Cache-Control": "no-store",
  };
}

async function readStoredBase64(id: string, metadata: Record<string, unknown>) {
  const inline = stringField(metadata.base64);
  if (inline) return inline;

  const rows = await prisma.auditLog.findMany({
    where: { action: "archive.uploadedFile.chunk", entityType: "ArchiveUploadedFileChunk", entityId: id },
    orderBy: { createdAt: "asc" },
    select: { metadata: true },
  });

  return rows
    .map((row) => {
      const chunkMetadata = metadataObject(row.metadata);
      return { index: numberField(chunkMetadata.index), base64: stringField(chunkMetadata.base64) };
    })
    .filter((chunk) => chunk.base64)
    .sort((a, b) => a.index - b.index)
    .map((chunk) => chunk.base64)
    .join("");
}

function safeFileName(value: string) {
  return value.replace(/[\\/\u0000-\u001f]/g, "-");
}
