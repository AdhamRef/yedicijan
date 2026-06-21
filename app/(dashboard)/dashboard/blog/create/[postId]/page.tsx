import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import getPost from "@/actions/get-post";
import LanguageTabs from "../_components/LanguageTabs";

export const revalidate = 0;

type PostWithRelations = Awaited<ReturnType<typeof getPost>>;
type TranslationRow = {
  locale: string;
  title?: string | null;
  description?: string | null;
  content?: string | null;
  image?: string | null;
};

function getTranslations(post: PostWithRelations): TranslationRow[] {
  if (!post || !("translations" in post)) return [];
  const t = (post as { translations?: TranslationRow[] }).translations;
  return Array.isArray(t) ? t : [];
}

export default async function PostEditorPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;

  const post = await getPost(postId);
  if (!post) {
    return notFound();
  }

  const translations = getTranslations(post);
  const trEn = translations.find((t) => t.locale === "en");
  const trFr = translations.find((t) => t.locale === "fr");

  const category = post.category
    ? { id: post.category.id, name: (post.category as { name?: string }).name ?? "" }
    : null;

  const editorPost = {
    id: post.id,
    slug: (post as { slug?: string | null }).slug ?? null,
    title: post.title ?? null,
    description: post.description ?? null,
    content: post.content ?? null,
    image: post.image ?? null,
    published: post.published,
    categoryId: post.categoryId ?? null,
    category_id: post.categoryId ?? undefined,
    campaignIds: Array.isArray((post as { campaignIds?: string[] }).campaignIds)
      ? (post as { campaignIds: string[] }).campaignIds
      : [],
    campaignId: null,
    campaign_id: undefined,
    category,
    titleAR: post.title ?? undefined,
    titleEN: trEn?.title ?? undefined,
    titleFR: trFr?.title ?? undefined,
    descriptionAR: post.description ?? undefined,
    descriptionEN: trEn?.description ?? undefined,
    descriptionFR: trFr?.description ?? undefined,
    contentAR: post.content ?? undefined,
    contentEN: trEn?.content ?? undefined,
    contentFR: trFr?.content ?? undefined,
    imageAR: post.image ?? undefined,
    imageEN: trEn?.image ?? undefined,
    imageFR: trFr?.image ?? undefined,
    translations: translations.map((t) => ({
      locale: t.locale,
      title: t.title ?? null,
      description: t.description ?? null,
      content: t.content ?? null,
      image: t.image ?? null,
    })),
  };

  const categories = await prisma.postCategory.findMany({
    orderBy: { name: "asc" },
  });

  const categoryOptions = categories.map((category) => ({
    label: category.name,
    value: category.id,
  }));

  const campaigns = await prisma.campaign.findMany({
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  });
  const campaignOptions = campaigns.map((c) => ({
    label: c.title,
    value: c.id,
  }));

  return (
    <div className="container mx-auto">
      <Card className="w-full mx-auto shadow-lg">
        <CardHeader className="bg-gray-50 border-b border-gray-200 py-6 px-6">
          <CardTitle className="text-2xl font-bold text-gray-800">
            تحرير المقال
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <LanguageTabs post={editorPost} categories={categoryOptions} campaignOptions={campaignOptions} />
        </CardContent>
      </Card>
    </div>
  );
}