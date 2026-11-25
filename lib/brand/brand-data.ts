import type {
  BrandAsset,
  BrandColor,
  BrandFont,
  BrandGuideline,
  BrandMessageFramework,
  BrandProfile,
} from "./brand-types";
import { dt, dtList } from "@/lib/dashboard/i18n";

export const brandProfiles: BrandProfile[] = [
  {
    id: "brand_yedicihan",
    key: "yedicihan",
    name: "Yedicihan Derneği",
    get description() { return dt("هوية الجمعية الخيرية التشغيلية الأساسية للوحة التحكم الحالية."); },
    get mission() { return dt("إيصال حملات إغاثة موثوقة مع دليل واضح للمتبرع وتحديثات ميدانية عملية."); },
    get vision() { return dt("رحلة تبرع يكون فيها كل تبرع سهل الإعطاء، سهل الثقة، ومرتبطًا بوضوح بالأثر."); },
    get contentVoice() { return dt("دافئ، موثوق، مباشر، مركّز على الإغاثة، وقائم على الدليل."); },
    get messagePhilosophy() { return dt("أبقِ المتبرع قريبًا من الميدان دون مبالغة؛ اعرض الدليل والإيصال والخطوة التالية بوضوح."); },
    primaryLocale: "tr",
    supportedLocales: ["tr", "ar", "en"],
    website: "yedicihan.org",
    isActive: true,
    status: "FOUNDATION",
    get verificationNote() { return dt("ملف اللوحة النشط؛ لا تزال ملفات الشعار/الأصول الرسمية بحاجة إلى تأكيد الرفع النهائي."); },
  },
];

export const brandAssets: BrandAsset[] = [
  {
    id: "asset_goz_primary_logo",
    profileId: "brand_yedicihan",
    get title() { return dt("الشعار الأساسي"); },
    type: "LOGO",
    format: "SVG",
    fileUrl: null,
    previewUrl: null,
    get usage() { return dt("اللوحة الرئيسية وإيصالات التبرع وترويسات الحملات الرسمية."); },
    locale: "all",
    get notes() { return dt("بحاجة إلى تأكيد: ارفع ملف الشعار/المتجه المعتمد."); },
    downloadable: false,
    createdBy: "brand-foundation",
    status: "TO_VERIFY",
  },
  {
    id: "asset_goz_receipt_template",
    profileId: "brand_yedicihan",
    get title() { return dt("قالب إيصال التبرع"); },
    type: "CERTIFICATE",
    format: "PDF",
    fileUrl: null,
    previewUrl: null,
    get usage() { return dt("رحلة الإيصال والشكر والدليل بعد التبرع."); },
    locale: "tr",
    get notes() { return dt("بحاجة إلى تأكيد: اربط بقالب شهادة حقيقي."); },
    downloadable: false,
    createdBy: "brand-foundation",
    status: "TO_VERIFY",
  },
];

export const brandColors: BrandColor[] = [
  { id: "color_goz_blue", profileId: "brand_yedicihan", get name() { return dt("أزرق الثقة"); }, hex: "#025EB8", rgb: "2, 94, 184", usage: "PRIMARY", get description() { return dt("لون الهوية الأساسي ولون التمييز في اللوحة."); }, order: 1 },
  { id: "color_goz_navy", profileId: "brand_yedicihan", get name() { return dt("كحلي داكن"); }, hex: "#10212B", rgb: "16, 33, 43", usage: "TEXT", get description() { return dt("العناوين ولوحات الثقة والأسطح الجادة في اللوحة."); }, order: 2 },
  { id: "color_goz_ivory", profileId: "brand_yedicihan", get name() { return dt("خلفية دافئة"); }, hex: "#FFFDF8", rgb: "255, 253, 248", usage: "BACKGROUND", get description() { return dt("خلفية ناعمة لصفحات الهوية الموجهة للمتبرعين."); }, order: 3 },
];

export const brandFonts: BrandFont[] = [
  { id: "font_goz_ui", profileId: "brand_yedicihan", name: "System UI", get usage() { return dt("واجهة اللوحة"); }, fallback: "Inter, Arial, sans-serif", source: "system", get notes() { return dt("مستقر لشاشات اللوحة الداخلية."); } },
];

export const brandGuidelines: BrandGuideline[] = [
  {
    id: "guide_goz_proof",
    profileId: "brand_yedicihan",
    section: "proof",
    get title() { return dt("الدليل قبل الضغط"); },
    get body() { return dt("يجب أن يعرض نص الحملة تحديثات ميدانية أو إيصالات أو دليلًا تشغيليًا قبل طلب مبلغ أعلى."); },
    examples: dtList(["الإيصال متاح بعد التبرع", "يُشارك التحديث الميداني بعد التوزيع"]),
    order: 1,
  },
  {
    id: "guide_goz_dignity",
    profileId: "brand_yedicihan",
    section: "donor-dignity",
    get title() { return dt("احترام كرامة المستفيد"); },
    get body() { return dt("تجنّب اللغة التي تُهين متلقّي المساعدة. أظهر الحاجة باحترام مع خطوة تالية واضحة."); },
    examples: dtList(["ادعم أسرة بطرد غذائي موثّق", "لا تستخدم عبارات مبالغ فيها من الشفقة"]),
    order: 2,
  },
  {
    id: "guide_global_ai",
    profileId: "brand_yedicihan",
    section: "cta",
    get title() { return dt("مخرجات الذكاء الاصطناعي مسودات فقط"); },
    get body() { return dt("قد يقترح الذكاء الاصطناعي نصوصًا وترجمات وفحوص ضوابط، لكنه لا يستطيع النشر أو إرسال الرسائل أو تغيير الميزانيات أو اعتماد الأصول."); },
    examples: dtList(["مسودة فقط", "بحاجة إلى اعتماد بشري"]),
    order: 3,
  },
];

export const brandMessageFrameworks: BrandMessageFramework[] = [
  {
    id: "framework_goz_friday",
    profileId: "brand_yedicihan",
    get name() { return dt("رسائل الجمعة"); },
    type: "FRIDAY",
    locale: "tr",
    structure: dtList(["دعاء قصير", "حاجة موثّقة", "إجراء التبرع", "إشارة الإيصال/الدليل"]),
    sampleText: "Cuma iyiliğinizi bugün güvenli bağışla ulaştırın. Bağış sonrası makbuz ve güncelleme paylaşılır.",
    doList: dtList(["اجعلها قصيرة", "اذكر الإيصال", "استخدم زر إجراء واحدًا"]),
    dontList: dtList(["لا تَعِد بنتائج محددة دون دليل", "لا تضغط بالشعور بالذنب"]),
  },
  {
    id: "framework_goz_thank_you",
    profileId: "brand_yedicihan",
    get name() { return dt("الشكر"); },
    type: "THANK_YOU",
    locale: "tr",
    structure: dtList(["امتنان", "ملخص التبرع", "ملاحظة الإيصال", "التحديث التالي"]),
    sampleText: "Bağışınız için teşekkür ederiz. Makbuzunuz hazır olduğunda paylaşılacak, saha güncellemesi ayrıca iletilecektir.",
    doList: dtList(["أكّد الثقة", "اشرح خطوة الدليل التالية"]),
    dontList: dtList(["لا تضف طلبًا قويًا ثانيًا مباشرة"]),
  },
  {
    id: "framework_goz_reactivation",
    profileId: "brand_yedicihan",
    get name() { return dt("إعادة تفعيل المتبرع"); },
    type: "DONOR_REACTIVATION",
    locale: "tr",
    structure: dtList(["تقدير دافئ", "مشروع مناسب", "طلب بسيط", "احترام إلغاء الاشتراك"]),
    sampleText: "Daha önceki desteğiniz için teşekkür ederiz. Dilerseniz bu ayki yardım çalışmasına güvenli bağışla katılabilirsiniz.",
    doList: dtList(["احترم الدعم السابق", "اجعل إلغاء الاشتراك محترمًا"]),
    dontList: dtList(["لا تُخجل المتبرعين غير النشطين", "لا تُلمّح إلى الإلزام"]),
  },
  {
    id: "framework_goz_general",
    profileId: "brand_yedicihan",
    get name() { return dt("حملة عامة"); },
    type: "GENERAL",
    locale: "tr",
    structure: dtList(["الحاجة", "إشارة الثقة", "المبلغ/الإجراء", "الدليل"]),
    sampleText: "Bugün güvenli bağışla sahadaki çalışmaya destek olun. Makbuz ve güncelleme bağış sonrası paylaşılır.",
    doList: dtList(["زر إجراء أساسي واحد", "سطر إيصال واضح"]),
    dontList: dtList(["لا تخلط حملات كثيرة في رسالة واحدة"]),
  },
];
