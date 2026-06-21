import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
import {
  writeAuditLog,
  auditActorFromSiteSession,
  auditStreamForRole,
} from '@/lib/audit-log';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new NextResponse('No file uploaded', { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileBase64 = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(fileBase64, {
      folder: 'campaigns',
      resource_type: 'auto',
    });

    const actor = auditActorFromSiteSession(session);
    await writeAuditLog({
      ...actor,
      action: "MEDIA_UPLOAD",
      messageAr: `${actor.actorName ?? "مستخدم"} رفع ملفًا إلى التخزين (${file.name || "ملف"})`,
      entityType: "Media",
      metadata: { publicId: result.public_id },
      stream: auditStreamForRole(actor.actorRole),
    });

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('publicId');

    if (!publicId) {
      return new NextResponse('Public ID is required', { status: 400 });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(`campaigns/${publicId}`);

    const actor = auditActorFromSiteSession(session);
    await writeAuditLog({
      ...actor,
      action: "MEDIA_DELETE",
      messageAr: `${actor.actorName ?? "مستخدم"} حذف صورة من التخزين`,
      entityType: "Media",
      metadata: { publicId },
      stream: auditStreamForRole(actor.actorRole),
    });

    return NextResponse.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return new NextResponse('Internal error', { status: 500 });
  }
}