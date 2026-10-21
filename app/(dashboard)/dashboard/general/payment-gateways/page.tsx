"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  CreditCard,
  Landmark,
  Loader2,
  Repeat,
  Settings,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

type SettingsResponse = {
  payforEnabled?: boolean;
  albarakaConfigured?: boolean;
  albarakaUseOOS?: boolean;
};

export default function PaymentGatewaysPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payforEnabled, setPayforEnabled] = useState(true);
  const [albarakaConfigured, setAlbarakaConfigured] = useState(true);
  const [albarakaUseOOS, setAlbarakaUseOOS] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get<SettingsResponse>("/api/global-settings")
      .then((res) => {
        if (cancelled) return;
        setPayforEnabled(res.data?.payforEnabled !== false);
        setAlbarakaConfigured(res.data?.albarakaConfigured !== false);
        setAlbarakaUseOOS(res.data?.albarakaUseOOS === true);
      })
      .catch(() => {
        if (!cancelled) setPayforEnabled(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleTogglePayfor = async (next: boolean) => {
    const prev = payforEnabled;
    setPayforEnabled(next);
    setSaving(true);
    try {
      await axios.put("/api/global-settings", { payforEnabled: next });
      toast.success(
        next
          ? "تم تفعيل PayFor — تبرعات الليرة التركية تمر عبره"
          : "تم إيقاف PayFor — تبرعات الليرة التركية ستمر عبر Albaraka"
      );
    } catch (e) {
      setPayforEnabled(prev);
      toast.error(
        axios.isAxiosError(e) && e.response?.data?.error
          ? String(e.response.data.error)
          : "تعذّر حفظ الإعداد"
      );
    } finally {
      setSaving(false);
    }
  };

  /** The live routing table, derived from the one switch that still exists. */
  const routes = [
    {
      when: "تبرع لمرة واحدة بالليرة التركية (TRY)",
      gateway: payforEnabled ? "PayFor — زراعت كاتيليم" : "Albaraka Türk",
      note: payforEnabled ? "3D Secure" : "3D Secure — لأن PayFor موقوف",
    },
    {
      when: "تبرع لمرة واحدة بأي عملة أخرى",
      gateway: "Albaraka Türk",
      note: "3D Secure — يُحوَّل المبلغ إلى الليرة التركية",
    },
    { when: "تبرع شهري (اشتراك)", gateway: "Stripe", note: "التحصيل المتكرر" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="بوابات الدفع"
        description="توجيه التبرعات ثابت حسب العملة ونوع التبرع. الإعداد الوحيد المتاح هو تفعيل أو إيقاف PayFor."
        icon={Settings}
      />

      {loading ? (
        <Card className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">جاري التحميل...</span>
        </Card>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">
              مسار التبرعات الحالي
            </h2>
            <Card className="divide-y divide-gray-100 overflow-hidden">
              {routes.map((r) => (
                <div
                  key={r.when}
                  className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <span className="text-sm text-gray-700">{r.when}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold text-gray-900">
                      {r.gateway}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-500">
                      {r.note}
                    </span>
                  </div>
                </div>
              ))}
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">الإعدادات</h2>

            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-amber-50 p-2 text-amber-700">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      PayFor — زراعت كاتيليم
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      يتولّى التبرعات الفردية بالليرة التركية عبر 3D Secure. عند
                      الإيقاف تنتقل هذه التبرعات إلى Albaraka، التي تحصّل
                      بالليرة أيضًا.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {saving && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                  <Switch
                    checked={payforEnabled}
                    disabled={saving}
                    onCheckedChange={handleTogglePayfor}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-emerald-50 p-2 text-emerald-700">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Albaraka Türk
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    البوابة الأساسية لكل التبرعات الفردية غير الليرة التركية.
                    مُهيّأة عبر متغيرات البيئة ولا تحتاج إعدادًا هنا.
                    {albarakaUseOOS &&
                      " يجمع البنك بيانات البطاقة على صفحته الخاصة."}
                  </p>
                  {!albarakaConfigured && (
                    <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                      <span>
                        غير مهيّأة — مفتاح التشفير
                        <code className="mx-1 font-mono">ALBARAKA_ENC_KEY</code>
                        مفقود، ولن تنجح أي عملية عبرها.
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-indigo-50 p-2 text-indigo-700">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Stripe — التبرعات الشهرية فقط
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    لم يعد Stripe يستقبل أي تبرع لمرة واحدة. يبقى مسؤولًا عن
                    الاشتراكات الشهرية وحدها، لأن بوابتَي 3D Secure لا توفّران
                    وسيلة للتحصيل المتكرر في الدورة التالية.
                  </p>
                </div>
              </div>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
