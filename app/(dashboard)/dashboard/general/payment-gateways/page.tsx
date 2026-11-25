"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  AlertTriangle,
  Coins,
  CreditCard,
  Landmark,
  Loader2,
  Settings,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { dashDir, dt } from "@/lib/dashboard/i18n";

type SettingsResponse = {
  payforEnabled?: boolean;
  albarakaConfigured?: boolean;
  albarakaUseOOS?: boolean;
  allowAnyAmount?: boolean;
};

export default function PaymentGatewaysPage() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [payforEnabled, setPayforEnabled] = useState(true);
  const [albarakaConfigured, setAlbarakaConfigured] = useState(true);
  const [albarakaUseOOS, setAlbarakaUseOOS] = useState(false);
  const [allowAnyAmount, setAllowAnyAmount] = useState(false);
  const [savingAnyAmount, setSavingAnyAmount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(false);
    axios
      .get<SettingsResponse>("/api/global-settings", { timeout: 20000 })
      .then((res) => {
        if (cancelled) return;
        setPayforEnabled(res.data?.payforEnabled !== false);
        setAlbarakaConfigured(res.data?.albarakaConfigured !== false);
        setAlbarakaUseOOS(res.data?.albarakaUseOOS === true);
        setAllowAnyAmount(res.data?.allowAnyAmount === true);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

  const errorMessage = (e: unknown, fallback: string) =>
    axios.isAxiosError(e) && e.response?.data?.error
      ? String(e.response.data.error)
      : fallback;

  /** Explicit confirmation for a change to where donors' money goes. Returns the
   * reason (possibly empty), or null when the admin cancels. */
  const confirmPaymentChange = (what: string): string | null =>
    window.prompt(
      dt("تنبيه: أنت على وشك تغيير مسار الدفع الفعلي لجميع التبرعات الجديدة.\n\n{0}\n\nاكتب سبب التغيير (اختياري) ثم اضغط «موافق» للتأكيد، أو «إلغاء» للتراجع.", [what]),
      ""
    );

  const handleTogglePayfor = async (next: boolean) => {
    if (loading || loadError || saving) return;
    const reason = confirmPaymentChange(
      next
        ? dt("تفعيل PayFor: التبرعات بالعملات غير الليرة التركية تمر عبره.")
        : dt("إيقاف PayFor: كل التبرعات ستمر عبر Albaraka.")
    );
    if (reason === null) return;
    const prev = payforEnabled;
    setPayforEnabled(next);
    setSaving(true);
    try {
      await axios.put("/api/global-settings", { payforEnabled: next, reason });
      toast.success(
        next
          ? dt("تم تفعيل PayFor — التبرعات بالعملات غير الليرة التركية تمر عبره")
          : dt("تم إيقاف PayFor — كل التبرعات ستمر عبر Albaraka")
      );
    } catch (e) {
      setPayforEnabled(prev);
      toast.error(errorMessage(e, dt("تعذّر حفظ الإعداد")));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAnyAmount = async (next: boolean) => {
    if (loading || loadError || savingAnyAmount) return;
    const reason = confirmPaymentChange(
      next
        ? dt("إلغاء حد الدولار الواحد في الموقع. قد تفرض البوابة أو البنك حدودًا مستقلة على مبلغ الدفع.")
        : dt("حد أدنى دولار واحد: لن تقبل السلة وصفحة الدفع أي تبرع تقل قيمته عن دولار واحد (أو ما يعادله بعملة المتبرع).")
    );
    if (reason === null) return;
    const prev = allowAnyAmount;
    setAllowAnyAmount(next);
    setSavingAnyAmount(true);
    try {
      await axios.put("/api/global-settings", { allowAnyAmount: next, reason });
      toast.success(next ? dt("أصبح بإمكان المتبرعين التبرع بأي مبلغ") : dt("أصبح الحد الأدنى للتبرع دولارًا واحدًا"));
    } catch (e) {
      setAllowAnyAmount(prev);
      toast.error(errorMessage(e, dt("تعذّر حفظ الإعداد")));
    } finally {
      setSavingAnyAmount(false);
    }
  };

  /** The live routing table, derived from the one switch that still exists. */
  const routes = [
    {
      when: dt("تبرع بالليرة التركية (TRY)"),
      gateway: "Albaraka Türk",
      note: "3D Secure",
    },
    {
      when: dt("تبرع بأي عملة أخرى"),
      gateway: payforEnabled ? dt("PayFor — زراعت كاتيليم") : "Albaraka Türk",
      note: payforEnabled
        ? dt("3D Secure — يُحوَّل المبلغ إلى الليرة التركية")
        : dt("3D Secure — لأن PayFor موقوف"),
    },
  ];

  return (
    <div className="space-y-6" dir={dashDir()}>
      <PageHeader
        title={dt("بوابات الدفع")}
        description={dt("توجيه التبرعات ثابت حسب العملة. الإعداد الوحيد المتاح هو تفعيل أو إيقاف PayFor.")}
        icon={Settings}
      />

      {loading ? (
        <Card className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{dt("جاري التحميل...")}</span>
        </Card>
      ) : loadError ? (
        <Card role="alert" className="space-y-3 border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><p>{dt("تعذّر تحميل إعدادات الدفع. أعد المحاولة قبل تعديل أي إعداد.")}</p><button type="button" className="rounded-lg border bg-white px-3 py-2" onClick={() => setLoadAttempt(attempt => attempt + 1)}>{dt("إعادة المحاولة")}</button></Card>
      ) : (
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">
              {dt("مسار التبرعات الحالي")}</h2>
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
            <h2 className="text-sm font-semibold text-gray-900">{dt("مبلغ التبرع")}</h2>
            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="rounded-full bg-sky-50 p-2 text-sky-700">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {dt("السماح بمبالغ أقل من دولار واحد")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {allowAnyAmount
                        ? dt("مفعّل: يُلغى حد الدولار الواحد في الموقع، مع بقاء ضوابط المبلغ والعملة لدى البوابة والبنك.")
                        : dt("معطّل: الحد الأدنى لكل تبرع دولار واحد أو ما يعادله بالعملة المختارة عند إنشاء الطلب. يطلب الموقع رفع المبالغ الأقل من هذا الحد.")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {dt("عملة العرض هي العملة المختارة للتبرع. قد يُرسل طلب البنك بعملة مختلفة حسب البوابة؛ وتوضح تفاصيل العملية المبلغ والعملة المرسلين فعليًا. المعادل بالدولار للمحاسبة، ولا يسري حد الدولار الواحد على الأوقاف ذات السعر الثابت.")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {savingAnyAmount && (
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  )}
                  <Switch
                    checked={allowAnyAmount}
                    disabled={savingAnyAmount}
                    onCheckedChange={handleToggleAnyAmount}
                  />
                </div>
              </div>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">{dt("الإعدادات")}</h2>

            <Card className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="rounded-full bg-amber-50 p-2 text-amber-700">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">
                      {dt("PayFor — زراعت كاتيليم")}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {dt("يتولّى التبرعات بكل العملات غير الليرة التركية عبر 3D Secure، ويحصّلها بالليرة بعد التحويل. عند الإيقاف تنتقل هذه التبرعات إلى Albaraka.")}</p>
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
                    {dt("البوابة الأساسية للتبرعات بالليرة التركية، وتتولّى كل العملات عند إيقاف PayFor. مُهيّأة عبر متغيرات البيئة ولا تحتاج إعدادًا هنا.")}
                    {albarakaUseOOS &&
                      ` ${dt("يجمع البنك بيانات البطاقة على صفحته الخاصة.")}`}
                  </p>
                  {!albarakaConfigured && (
                    <p className="text-xs text-amber-700 mt-2 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                      <span>
                        {dt("غير مهيّأة — مفتاح التشفير")}
                        <code className="mx-1 font-mono">ALBARAKA_ENC_KEY</code>
                        {dt("مفقود، ولن تنجح أي عملية عبرها.")}
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
