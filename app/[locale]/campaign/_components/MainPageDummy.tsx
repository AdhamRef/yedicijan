"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";
import { Button } from "@/components/ui/button";
import {
  Clock,
  MessageCircle,
  Edit2,
  Trash2,
  Send,
  Loader2,
  MoreHorizontal,
  Bell,
  Info,
  Book,
  ChevronLeft,
  ChevronRight,
  Users,
  TrendingUp,
  Heart,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import Modal from "@/app/[locale]/components/Modal";
import SignInDialog from "@/components/SignInDialog";
import DonationSidebar from "../_components/DonationSidebar";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import CategoryIcon from "@/components/CategoryIcon";
import WysiwygEditor from "@/app/[locale]/blog/_components/wysiwyg/wysiwyg-editor";
import SuggestedCampaigns from "./SuggestedCampaigns";

// Types
interface Category {
  id?: string;
  slug?: string | null;
  nameAr?: string;
  nameEn?: string;
  nameFr?: string;
  name?: string;
  icon?: string;
}

interface Campaign {
  id: string;
  slug?: string | null;
  titleAr?: string;
  titleEn?: string;
  titleFr?: string;
  title?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  descriptionFr?: string;
  description?: string;
  images: string[];
  videoUrl?: string | null;
  targetAmount: number;
  amountRaised?: number;
  currentAmount?: number;
  donationCount: number;
  progress: number;
  showProgress?: boolean;
  goalType?: string;
  fundraisingMode?: string;
  sharePriceUSD?: number | null;
  suggestedShareCounts?: { counts: number[]; priceByCurrency?: Record<string, number> };
  category: Category;
  donationStats: {
    first: DonationStat | null;
    largest: DonationStat | null;
    last: DonationStat | null;
  };
  updates: Array<{
    id: string;
    titleAr?: string;
    titleEn?: string;
    titleFr?: string;
    title?: string;
    descriptionAr?: string;
    descriptionEn?: string;
    descriptionFr?: string;
    description?: string;
    image: string | null;
    videoUrl?: string;
    createdAt: string;
  }>;
}

interface DonationStat {
  amount: number;
  donor: string;
}

interface Comment {
  id: string;
  text: string;
  createdAt: string;
  user: {
    name: string;
    image: string;
    email?: string;
  };
}

const FALLBACK = "https://i.ibb.co/N2zVsqfg/calisma-alanlarimiz-egitim-sektoru.jpg";

/** Convert any video share URL into an embeddable iframe src */
function resolveEmbedUrl(raw: string): string {
  try {
    const url = new URL(raw);
    // YouTube: youtube.com/watch?v=ID  or  youtu.be/ID  or  /shorts/ID
    if (url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) {
      let vid = url.searchParams.get("v");
      if (!vid && url.hostname === "youtu.be") vid = url.pathname.slice(1).split("?")[0];
      if (!vid) { const m = url.pathname.match(/\/(?:shorts|embed)\/([^/?]+)/); if (m) vid = m[1]; }
      if (vid) return `https://www.youtube.com/embed/${vid}?rel=0`;
    }
    // Facebook: use plugin embed with the resolved (non-share) URL
    if (url.hostname.includes("facebook.com")) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(raw)}&show_text=false&width=720&allowfullscreen=true`;
    }
  } catch { /* fall through */ }
  return raw;
}

/** Returns true for Facebook short-share URLs that need server-side resolution */
function isFbShareUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.hostname.includes("facebook.com") && url.pathname.startsWith("/share/");
  } catch { return false; }
}

/** Renders a 16:9 video iframe, resolving Facebook share URLs server-side first */
function VideoEmbed({ rawUrl, title, className }: { rawUrl: string; title?: string; className?: string }) {
  const [src, setSrc] = React.useState<string>(() =>
    isFbShareUrl(rawUrl) ? "" : resolveEmbedUrl(rawUrl)
  );

  React.useEffect(() => {
    if (!isFbShareUrl(rawUrl)) { setSrc(resolveEmbedUrl(rawUrl)); return; }
    fetch(`/api/resolve-url?url=${encodeURIComponent(rawUrl)}`)
      .then(r => r.json())
      .then(({ resolved }: { resolved: string }) => setSrc(resolveEmbedUrl(resolved)))
      .catch(() => setSrc(resolveEmbedUrl(rawUrl)));
  }, [rawUrl]);

  if (!src) return null;

  return (
    <div className={className} style={{ position: "relative", paddingBottom: "56.25%" }}>
      <iframe
        src={src}
        title={title || "video"}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}


const IntegratedCampaignPage = ({ id, locale: propLocale }: { id: string; locale?: string }) => {
  const t = useTranslations("Campaign");
  const tNav = useTranslations("CampaignsPage");
  const tTrust = useTranslations("SignInDialog");
  const localeFromHook = useLocale() as "ar" | "en" | "fr";
  const locale = (propLocale as any) || localeFromHook;
  const isRTL = locale === "ar";
  const { data: session } = useSession();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ type: "image" | "video"; src: string; alt?: string } | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeSection, setActiveSection] = useState<string>("description");
  const [isSignInOpen, setIsSignInOpen] = useState(false);

  const getLocalizedProperty = (obj: any, key: string) => {
    if (!obj) return "";
    if (obj[key]) return obj[key];
    const localeKey = `${key}${locale.charAt(0).toUpperCase() + locale.slice(1)}`;
    if (obj[localeKey]) return obj[localeKey];
    return obj[`${key}Ar`] || "";
  };

  useEffect(() => {
    const fetchCampaignData = async () => {
      try {
        setLoading(true);
        const response = await axios.get<Campaign>(
          `/api/campaigns/${id}?locale=${encodeURIComponent(locale)}`,
          { headers: { "x-locale": locale } }
        );
        if (!response.data) throw new Error("Campaign not found");
        setCampaign(response.data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : t("fetchError");
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchCampaignData();
  }, [id, locale]);


  useEffect(() => {
    if (!campaign) return;
    axios.get(`/api/campaigns/${id}/comments`)
      .then(r => setComments(r.data))
      .catch(() => toast.error(t("failedToLoadComments")));
  }, [id, campaign]);

  // Scroll-spy: highlight the section nav item for whichever section is in view.
  useEffect(() => {
    if (!campaign) return;
    const ids = ["description", "updates", "comments", "info"];
    const els = ids
      .map((sid) => document.getElementById(`section-${sid}`))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveSection(visible[0].target.id.replace("section-", ""));
      },
      { rootMargin: "-140px 0px -55% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [campaign, comments.length]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!session) { setIsSignInOpen(true); return; }
    setIsSubmitting(true);
    try {
      const r = await axios.post(`/api/campaigns/${id}/comments`, { text: newComment });
      setComments([r.data, ...comments]);
      setNewComment("");
      toast.success(t("commentAdded"));
    } catch { toast.error(t("failedToAddComment")); }
    finally { setIsSubmitting(false); }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editText.trim()) return;
    setIsSubmitting(true);
    try {
      const r = await axios.patch(`/api/campaigns/${id}/comments/${commentId}`, { text: editText });
      setComments(comments.map(c => c.id === commentId ? r.data : c));
      setEditingComment(null);
      toast.success(t("commentUpdated"));
    } catch { toast.error(t("failedToUpdateComment")); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm(t("confirmDeleteComment"))) return;
    try {
      await axios.delete(`/api/campaigns/${id}/comments/${commentId}`);
      setComments(comments.filter(c => c.id !== commentId));
      toast.success(t("commentDeleted"));
    } catch { toast.error(t("failedToDeleteComment")); }
  };

  const scrollToEl = (elId: string) =>
    document.getElementById(elId)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const scrollToSection = (sid: string) => {
    setActiveSection(sid);
    scrollToEl(`section-${sid}`);
  };

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "ar" ? "ar-SA" : locale === "fr" ? "fr-FR" : "en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

  if (loading) return <LoadingSkeleton />;

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-offwhite/60 flex items-center justify-center px-4">
        <div className="text-center max-w-md bg-white shape-card shadow-soft p-10">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Info className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-deep mb-2">{t("campaignNotFound")}</h2>
          <p className="text-gray-500 mb-6">{error || t("campaignNotFoundDescription")}</p>
          <Button onClick={() => window.history.back()} className="shape-button bg-burgundy hover:bg-burgundyDark">
            {t("goBack")}
          </Button>
        </div>
      </div>
    );
  }

  const currentImg = campaign.images[selectedImage] || FALLBACK;
  const updatesCount = campaign.updates?.length ?? 0;

  const sections: { id: string; label: string; icon: typeof Book; badge?: number }[] = [
    { id: "description", label: t("story"), icon: Book },
    { id: "updates", label: t("updates"), icon: Bell, badge: updatesCount },
    { id: "comments", label: t("comments"), icon: MessageCircle, badge: comments.length },
    { id: "info", label: t("info"), icon: Info },
  ];

  // RTL-aware gallery navigation
  const atStart = selectedImage === 0;
  const atEnd = selectedImage === campaign.images.length - 1;
  const goPrev = () => setSelectedImage((i) => (isRTL ? Math.min(campaign.images.length - 1, i + 1) : Math.max(0, i - 1)));
  const goNext = () => setSelectedImage((i) => (isRTL ? Math.max(0, i - 1) : Math.min(campaign.images.length - 1, i + 1)));

  const SectionHeading = ({ icon: Icon, label, count }: { icon: typeof Book; label: string; count?: number }) => (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-burgundy/10 text-burgundy">
          <Icon className="w-4 h-4" />
        </span>
        <h2 className="text-lg sm:text-xl font-extrabold text-deep">{label}</h2>
        {count !== undefined && count > 0 && (
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      <div className="gold-mark-sm mt-3" />
    </div>
  );

  return (
    <>
      <main className="min-h-screen bg-offwhite/60 pb-28 lg:pb-16" dir={isRTL ? "rtl" : "ltr"}>

        {/* ── Immersive full-bleed hero ── */}
        <section className="relative w-full">
          <div className="relative h-[58vh] min-h-[440px] max-h-[660px] w-full overflow-hidden bg-deep">
            {/* Blurred fill for letterboxed images */}
            <Image
              src={currentImg}
              alt=""
              aria-hidden
              fill
              sizes="100vw"
              className="object-cover scale-110 blur-2xl opacity-30 pointer-events-none"
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <Image
                  src={currentImg}
                  alt={getLocalizedProperty(campaign, "title")}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Cinematic gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-deep via-deep/65 to-deep/15 pointer-events-none" />

            {/* Image counter */}
            {campaign.images.length > 1 && (
              <div className="absolute top-4 end-4 z-10 rounded-full bg-black/40 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 tabular-nums">
                {selectedImage + 1} / {campaign.images.length}
              </div>
            )}

            {/* Gallery arrows */}
            {campaign.images.length > 1 && (
              <>
                <button
                  onClick={goPrev}
                  disabled={isRTL ? atEnd : atStart}
                  aria-label="Previous image"
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/85 hover:bg-white text-deep shadow-md flex items-center justify-center transition-all disabled:opacity-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goNext}
                  disabled={isRTL ? atStart : atEnd}
                  aria-label="Next image"
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/85 hover:bg-white text-deep shadow-md flex items-center justify-center transition-all disabled:opacity-0"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Hero content */}
            <div className="absolute inset-x-0 bottom-0 z-10">
              <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-8 lg:pb-12">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-white/70 text-xs mb-4">
                  <Link href="/" className="hover:text-white transition-colors">{tNav("home")}</Link>
                  <ChevronRight className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`} />
                  <Link href="/campaigns" className="hover:text-white transition-colors">{tNav("campaigns")}</Link>
                </nav>

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Link
                    href={`/category/${campaign.category.slug || campaign.category.id}`}
                    className="inline-flex items-center gap-1.5 shape-chip bg-burgundy hover:bg-burgundyDark text-white text-[11px] sm:text-xs font-bold px-3 py-1.5 uppercase tracking-wide transition-colors"
                  >
                    <CategoryIcon name={campaign.category.icon} className="w-3.5 h-3.5" />
                    {getLocalizedProperty(campaign.category, "name")}
                  </Link>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[11px] sm:text-xs font-bold px-3 py-1.5 border border-white/25">
                    <ShieldCheck className="w-3.5 h-3.5 text-gold" />
                    {tTrust("trusted")}
                  </span>
                </div>

                <div className="gold-mark mb-4" />
                <h1 className="max-w-3xl text-2xl sm:text-4xl lg:text-[2.75rem] font-extrabold text-white leading-[1.13] tracking-tight">
                  {getLocalizedProperty(campaign, "title")}
                </h1>

                {/* Proof chips + CTA */}
                <div className="mt-5 flex flex-wrap items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md text-deep text-xs sm:text-sm font-bold px-3.5 py-2 shadow-sm">
                    <Heart className="w-4 h-4 text-burgundy" fill="currentColor" />
                    {campaign.donationCount.toLocaleString()} {t("donor")}
                  </span>
                  {campaign.showProgress !== false && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-md text-deep text-xs sm:text-sm font-bold px-3.5 py-2 shadow-sm tabular-nums">
                      <TrendingUp className="w-4 h-4 text-gold" />
                      {campaign.progress.toFixed(0)}% {t("completed")}
                    </span>
                  )}
                  <button
                    onClick={() => scrollToEl("donation-rail")}
                    className="hidden lg:inline-flex items-center gap-2 shape-button bg-gold hover:bg-gold/90 text-deep text-sm font-extrabold px-6 py-2.5 transition-colors shadow-soft"
                  >
                    <Heart className="w-4 h-4" fill="currentColor" />
                    {t("donateNow")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Thumbnail filmstrip — overlaps the hero base */}
          {campaign.images.length > 1 && (
            <div className="max-w-7xl mx-auto px-4 lg:px-8">
              <div className="relative z-20 -mt-7 flex gap-2.5 overflow-x-auto scrollbar-hide pb-2">
                {campaign.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    aria-label={`${t("image")} ${i + 1}`}
                    className={`relative flex-shrink-0 rounded-xl overflow-hidden shadow-md transition-all duration-200 ${
                      selectedImage === i
                        ? "ring-2 ring-gold scale-105"
                        : "ring-2 ring-white/80 opacity-80 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={img}
                      alt=""
                      width={88}
                      height={62}
                      className="w-[68px] h-12 sm:w-[88px] sm:h-[62px] object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Body: content + donation rail ── */}
        <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 lg:mt-10">
          <div className="grid lg:grid-cols-12 gap-6 lg:gap-10">

            {/* Left: sticky section nav + stacked content */}
            <div className="lg:col-span-8 min-w-0">

              {/* Sticky anchor nav */}
              <div className="sticky top-12 lg:top-[88px] z-30 -mx-4 lg:mx-0 px-4 lg:px-0 py-2 lg:py-0">
                <div className="flex gap-1 sm:gap-1.5 overflow-x-auto scrollbar-hide bg-white shape-card shadow-soft p-1.5">
                  {sections.map(({ id: sid, label, icon: Icon, badge }) => {
                    const active = activeSection === sid;
                    return (
                      <button
                        key={sid}
                        onClick={() => scrollToSection(sid)}
                        className={`relative flex items-center justify-center gap-1.5 flex-1 min-w-fit whitespace-nowrap px-3 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                          active ? "bg-burgundy text-white shadow-sm" : "text-gray-500 hover:text-deep hover:bg-offwhite"
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{label}</span>
                        {badge !== undefined && badge > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                            active ? "bg-white/25 text-white" : "bg-gray-100 text-gray-500"
                          }`}>
                            {badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 space-y-5 sm:space-y-6">

                {/* Story */}
                <section id="section-description" className="scroll-mt-32 lg:scroll-mt-44 bg-white shape-card shadow-soft p-5 sm:p-7">
                  <SectionHeading icon={Book} label={t("story")} />
                  {(() => {
                    const desc = getLocalizedProperty(campaign, "description") as string;
                    if (!desc) return <p className="text-gray-400 text-sm">—</p>;
                    const trimmed = desc.trim();
                    if (trimmed.startsWith("{")) {
                      try {
                        const parsed = JSON.parse(trimmed);
                        if (parsed?.type === "doc") {
                          return (
                            <div className="prose max-w-none [&_.ProseMirror]:min-h-0 [&_.ProseMirror]:p-0 [&_.ProseMirror]:focus:outline-none">
                              <WysiwygEditor defaultValue={parsed} isEditable={false} className="border-0 shadow-none p-0 min-h-0" />
                            </div>
                          );
                        }
                      } catch {}
                    }
                    return (
                      <p className="text-gray-700 text-sm sm:text-base leading-relaxed sm:leading-loose whitespace-pre-line">
                        {desc}
                      </p>
                    );
                  })()}

                  {/* Campaign video lives inside the story */}
                  {campaign.videoUrl && (
                    <VideoEmbed
                      rawUrl={campaign.videoUrl}
                      title={String(campaign.title ?? "")}
                      className="mt-6 rounded-2xl overflow-hidden shadow-soft ring-1 ring-black/5 bg-black"
                    />
                  )}
                </section>

                {/* Updates */}
                <section id="section-updates" className="scroll-mt-32 lg:scroll-mt-44 bg-white shape-card shadow-soft p-5 sm:p-7">
                  <SectionHeading icon={Bell} label={t("updates")} count={updatesCount} />
                  {updatesCount > 0 ? (
                    <div className="space-y-5">
                      {campaign.updates.map((update, i) => (
                        <motion.div
                          key={update.id}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: Math.min(i * 0.06, 0.3) }}
                          className="flex gap-4 pb-5 border-b border-gray-100 last:border-0 last:pb-0"
                        >
                          <div className="flex-shrink-0">
                            <div className="w-9 h-9 rounded-full bg-burgundy/10 flex items-center justify-center">
                              <Bell className="w-4 h-4 text-burgundy" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-deep mb-0.5">
                              {getLocalizedProperty(update, "title")}
                            </h3>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mb-2">
                              <Clock className="w-3 h-3" />
                              {fmtDate(update.createdAt)}
                            </p>
                            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line mb-3">
                              {getLocalizedProperty(update, "description")}
                            </p>
                            {update.videoUrl && (
                              <VideoEmbed
                                rawUrl={update.videoUrl}
                                title={getLocalizedProperty(update, "title") || "video"}
                                className="rounded-xl overflow-hidden bg-black mb-3"
                              />
                            )}
                            {update.image && (
                              <button
                                onClick={() => { setModalContent({ type: "image", src: update.image!, alt: getLocalizedProperty(update, "title") }); setIsModalOpen(true); }}
                                className="group relative rounded-xl overflow-hidden ring-1 ring-gray-200 hover:ring-burgundy transition-all"
                              >
                                <Image src={update.image} alt="" width={96} height={96} className="w-24 h-24 object-cover group-hover:scale-105 transition-transform duration-300" />
                              </button>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">{t("noUpdates")}</p>
                    </div>
                  )}
                </section>

                {/* Comments */}
                <section id="section-comments" className="scroll-mt-32 lg:scroll-mt-44 bg-white shape-card shadow-soft p-5 sm:p-7">
                  <SectionHeading icon={MessageCircle} label={t("comments")} count={comments.length} />

                  <div className="mb-5">
                    {session ? (
                      <form onSubmit={handleAddComment} className="flex gap-3 bg-offwhite/70 rounded-2xl p-3 border border-gray-200 focus-within:border-burgundy/40 focus-within:ring-2 focus-within:ring-burgundy/10 transition-all">
                        <Avatar className="w-8 h-8 flex-shrink-0 mt-0.5">
                          <AvatarImage src={session.user?.image || ""} />
                          <AvatarFallback className="bg-burgundy/10 text-burgundy text-xs font-bold">
                            {session.user?.name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <Textarea
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            placeholder={t("commentPlaceholder")}
                            className="w-full resize-none border-none shadow-none focus-visible:ring-0 text-sm bg-transparent p-0 min-h-[40px]"
                            rows={2}
                          />
                          <div className="flex justify-end mt-2">
                            <Button type="submit" disabled={!newComment.trim() || isSubmitting} size="sm"
                              className="shape-button bg-burgundy hover:bg-burgundyDark text-white h-8 gap-1.5">
                              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              {t("send")}
                            </Button>
                          </div>
                        </div>
                      </form>
                    ) : (
                      <button onClick={() => setIsSignInOpen(true)}
                        className="w-full flex items-center gap-3 bg-offwhite/70 hover:bg-offwhite border border-gray-200 rounded-2xl p-3.5 text-sm text-gray-500 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-gray-400" />
                        </div>
                        <span>{t("signInToComment")}</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1">
                    {comments.length > 0 ? comments.map((comment, i) => (
                      <motion.div key={comment.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.25) }}
                        className="flex gap-3 p-3 rounded-xl hover:bg-offwhite/60 transition-colors group">
                        <Avatar className="w-8 h-8 flex-shrink-0">
                          <AvatarImage src={comment.user.image} />
                          <AvatarFallback className="text-xs font-bold bg-gray-100 text-gray-600">
                            {comment.user.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-deep">{comment.user.name}</span>
                              <span className="text-[11px] text-gray-400">{new Date(comment.createdAt).toLocaleDateString(locale === "ar" ? "ar-SA" : locale === "fr" ? "fr-FR" : "en-US")}</span>
                            </div>
                            {session?.user?.email === comment.user.email && (
                              <div className="relative flex-shrink-0">
                                <button onClick={() => setOpenDropdownId(openDropdownId === comment.id ? null : comment.id)}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-all">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                                {openDropdownId === comment.id && (
                                  <div className="absolute end-0 mt-1 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
                                    <button onClick={() => { setEditingComment(comment.id); setEditText(comment.text); setOpenDropdownId(null); }}
                                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                                      <Edit2 className="w-3.5 h-3.5" />{t("edit")}
                                    </button>
                                    <button onClick={() => { handleDeleteComment(comment.id); setOpenDropdownId(null); }}
                                      className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />{t("delete")}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          {editingComment === comment.id ? (
                            <div>
                              <Textarea value={editText} onChange={e => setEditText(e.target.value)} className="mb-2 text-sm" rows={2} />
                              <div className="flex gap-2">
                                <Button onClick={() => handleEditComment(comment.id)} disabled={isSubmitting} size="sm" className="shape-button bg-burgundy hover:bg-burgundyDark text-white h-8">
                                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("save")}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditingComment(null)} className="h-8">{t("cancel")}</Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-700 leading-relaxed">{comment.text}</p>
                          )}
                        </div>
                      </motion.div>
                    )) : (
                      <div className="text-center py-10">
                        <MessageCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">{t("noComments")}</p>
                      </div>
                    )}
                  </div>
                </section>

                {/* Info */}
                <section id="section-info" className="scroll-mt-32 lg:scroll-mt-44 bg-white shape-card shadow-soft p-5 sm:p-7">
                  <SectionHeading icon={Info} label={t("info")} />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-burgundy/[0.06] p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-burgundy mb-1">
                        <Users className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t("donor")}</span>
                      </div>
                      <span className="text-2xl sm:text-3xl font-extrabold text-deep">{campaign.donationCount.toLocaleString()}</span>
                    </div>
                    <div className="rounded-2xl bg-gold/10 p-4 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 mb-1" style={{ color: "#9a7727" }}>
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">{t("completed")}</span>
                      </div>
                      <span className="text-2xl sm:text-3xl font-extrabold text-deep">{campaign.progress.toFixed(0)}%</span>
                    </div>
                  </div>
                </section>
              </div>
            </div>

            {/* Right: donation rail (desktop) */}
            <div id="donation-rail" className="lg:col-span-4 max-lg:hidden">
              <DonationSidebar campaign={campaign} />
            </div>
          </div>

          {/* Suggested campaigns from the same category */}
          {campaign.category?.id && (
            <div className="mt-8 sm:mt-12">
              <SuggestedCampaigns
                categoryId={campaign.category.id}
                currentCampaignId={campaign.id}
                categoryName={getLocalizedProperty(campaign.category, "name")}
                categorySlug={campaign.category.slug ?? campaign.category.id}
                categoryIcon={campaign.category.icon}
              />
            </div>
          )}
        </div>

        {/* Mobile / tablet sticky donate bar */}
        <div className="lg:hidden">
          <DonationSidebar campaign={campaign} isMobileSticky />
        </div>
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} content={modalContent} />
      <SignInDialog isOpen={isSignInOpen} onClose={() => setIsSignInOpen(false)} />
    </>
  );
};

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="min-h-screen bg-offwhite/60 pb-28 lg:pb-16">
    {/* Hero skeleton */}
    <div className="relative h-[58vh] min-h-[440px] max-h-[660px] w-full bg-deep overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-[shimmer_1.8s_infinite] -translate-x-full" />
      <div className="absolute inset-x-0 bottom-0">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-10 space-y-4">
          <div className="flex gap-2">
            <div className="h-7 w-28 bg-white/20 rounded-full animate-pulse" />
            <div className="h-7 w-24 bg-white/15 rounded-full animate-pulse" />
          </div>
          <div className="h-10 w-3/4 bg-white/20 rounded-xl animate-pulse" />
          <div className="h-10 w-1/2 bg-white/15 rounded-xl animate-pulse" />
          <div className="flex gap-2.5 pt-2">
            <div className="h-9 w-28 bg-white/20 rounded-full animate-pulse" />
            <div className="h-9 w-28 bg-white/15 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </div>

    {/* Body skeleton */}
    <div className="max-w-7xl mx-auto px-4 lg:px-8 mt-6 lg:mt-10">
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-10">
        <div className="lg:col-span-8 space-y-5">
          <div className="h-14 bg-white shape-card shadow-soft animate-pulse" />
          <div className="bg-white shape-card shadow-soft p-7 space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className={`h-3.5 bg-gray-100 rounded-full animate-pulse ${
                i === 3 ? "w-4/5" : i === 5 ? "w-2/3" : i === 6 ? "w-3/4" : "w-full"
              }`} />
            ))}
          </div>
        </div>
        <div className="lg:col-span-4 hidden lg:block">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-soft overflow-hidden">
            <div className="h-1.5 w-full bg-gray-200" />
            <div className="p-7 space-y-4">
              <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-3/5" />
              <div className="h-2.5 bg-gray-100 rounded-full animate-pulse w-full" />
              <div className="h-12 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="h-14 bg-gray-200 rounded-2xl animate-pulse mt-2" />
              <div className="h-14 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default IntegratedCampaignPage;
