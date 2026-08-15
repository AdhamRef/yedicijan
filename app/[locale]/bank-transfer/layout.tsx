import type { Metadata } from "next";
import { buildPageMetadata, LOCALE_SEO, type Locale } from "@/lib/seo";

const BANK_TRANSFER_SEO: Record<Locale, { title: string; description: string }> = {
  ar: {
    title: "التبرع عبر التحويل البنكي | جمعية قرة العيون للإغاثة والتكافل",
    description: "اطّلع على حسابات جمعية قرة العيون البنكية وتبرع بأمان عبر التحويل البنكي لدعم المشاريع الإنسانية والطبية والتعليمية.",
  },
  en: {
    title: "Donate by Bank Transfer | Gözbebekleri",
    description: "View Gözbebekleri bank accounts and complete your donation safely by bank transfer to support humanitarian, medical, and educational projects.",
  },
  fr: {
    title: "Faire un don par virement bancaire | Gözbebekleri",
    description: "Consultez les comptes bancaires de Gözbebekleri et effectuez votre don en toute sécurité par virement bancaire pour soutenir nos projets humanitaires.",
  },
  tr: {
    title: "Banka Havalesi ile Bağış | Gözbebekleri Derneği",
    description: "Gözbebekleri Derneği banka hesaplarını görüntüleyin ve insani, tıbbi ve eğitim projelerine güvenle havale yoluyla bağış yapın.",
  },
  id: {
    title: "Donasi melalui Transfer Bank | Gözbebekleri",
    description: "Lihat rekening bank Gözbebekleri dan selesaikan donasi Anda dengan aman melalui transfer bank untuk mendukung program kemanusiaan.",
  },
  pt: {
    title: "Doar por transferência bancária | Gözbebekleri",
    description: "Veja as contas bancárias da Gözbebekleri e conclua a sua doação com segurança por transferência bancária para apoiar projetos humanitários.",
  },
  es: {
    title: "Donar por transferencia bancaria | Gözbebekleri",
    description: "Consulta las cuentas bancarias de Gözbebekleri y completa tu donación de forma segura mediante transferencia bancaria para apoyar proyectos humanitarios.",
  },
  de: {
    title: "Per Banküberweisung spenden | Gözbebekleri",
    description: "Sieh dir die Bankkonten von Gözbebekleri an und schließe deine Spende sicher per Banküberweisung ab, um humanitäre Projekte zu unterstützen.",
  },
};

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = (rawLocale in LOCALE_SEO ? rawLocale : "en") as Locale;
  const seo = BANK_TRANSFER_SEO[locale] ?? BANK_TRANSFER_SEO.en;

  return buildPageMetadata(locale, {
    title: seo.title,
    description: seo.description,
    path: "/bank-transfer",
    keywords: LOCALE_SEO[locale].keywords,
  });
}

export default function BankTransferLayout({ children }: Props) {
  return children;
}
