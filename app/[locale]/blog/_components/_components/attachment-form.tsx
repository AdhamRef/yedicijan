"use client";

import * as z from "zod";
import axios from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { File, Loader2, PlusCircle, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
// Legacy course-attachment UI: the current schema does not expose Chapter/Attachment.
// Keep the local display contract explicit instead of relying on missing Prisma models.
type Attachment = { id: string; name: string };
type Chapter = { title?: string | null };

interface AttachmentFormProps {
  initialData: Chapter & { attachments: Attachment[] };
  courseId: string;
  chapterId: string;
}

const AttachmentForm: React.FC<AttachmentFormProps> = ({
  initialData,
  courseId,
  chapterId,
}) => {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsEditing((current) => !current);
  };

  const formSchema = z.object({
    pdfUrl: z.string().min(1),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { pdfUrl: "" },
  });

  const { isSubmitting, isValid } = form.formState;

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      await axios.post(
        `/api/courses/${courseId}/chapters/${chapterId}/attachments`,
        values
      );
      toast.success("تم تحديث معلومات الحصة");
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Failed to update the course", error);
      toast.error("حدث خطأ");
    }
  }

  const onDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await axios.delete(
        `/api/courses/${courseId}/chapters/${chapterId}/attachments/${id}`
      );
      toast.success("تم مسح المرفق");
      router.refresh();
    } catch (error) {
      toast.error("حدث خطأ");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-6 border bg-slate-100 rounded-md p-6">
      <div className="font-medium flex items-center justify-between">
        مرفقات الحصة
        <Button variant="ghost" onClick={toggleEdit}>
          {isEditing && <>إلغاء</>}
          {!isEditing && (
            <>
              <PlusCircle className="h-4 w-4 ml-2" />
              أضف ملف
            </>
          )}
        </Button>
      </div>
      {isEditing ? (
        <div>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            <label htmlFor="attachment-url" className="block text-sm font-medium">
              رابط المرفق (PDF)
            </label>
            <input
              id="attachment-url"
              type="url"
              required
              {...form.register("pdfUrl")}
              placeholder="https://example.org/file.pdf"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              حفظ الرابط
            </Button>
          </form>
          <div className="text-xs text-muted-foreground mt-4">
            أرفع أي مرفق يمكن أن يحتاجه الطالب لمذاكرة الدرس
          </div>
        </div>
      ) : (
        <>
          {initialData.attachments?.length === 0 || initialData.attachments  == undefined  ? (
            <p className="text-sm mt-2 text-slate-500 italic">
              لم يتم رفع أي مرفقات بعد
            </p>
          ) : (
            <div className="space-y-2">
              {initialData.attachments?.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center p-3 w-full bg-sky-100 border-sky-200 border text-sky-700 rounded-md"
                >
                  <File className="h-4 w-4 ml-2 flex-shrink-0" />
                  <p className="text-xs line-clamp-1">{attachment.name}</p>
                  {deletingId === attachment.id && (
                    <div className="mr-auto">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                  {deletingId !== attachment.id && (
                    <button
                      onClick={() => {
                        onDelete(attachment.id);
                      }}
                      className="mr-auto hover:opacity-75 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AttachmentForm;
