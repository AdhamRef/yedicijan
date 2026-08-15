"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { CreditCard, Loader2, Lock, Settings, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";

type SettingsResponse = {
  payforEnabled?: boolean;
};

export default function PaymentGatewaysPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payforEnabled, setPayforEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    axios
      .get<SettingsResponse>("/api/global-settings")
      .then((res) => {
        if (cancelled) return;
        setPayforEnabled(res.data?.payforEnabled !== false);
      })
      .catch(() => {
        if (cancelled) return;
        setPayforEnabled(true);
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
          ? "تم تفعيل بوابة PayFor"
          : "تم إيقاف PayFor — جميع التبرعات ستمر عبر Stripe"
      );
    } catch (e) {
      setPayforEnabled(prev);
      const msg =
        axios.isAxiosError(e) && e.response?.data?.error
          ? String(e.response.data.error)
          : "تعذّر حفظ الإعداد";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="بوابات الدفع"
        description="تحكّم في بوابات الدفع المتاحة للمتبرعين. Stripe مفعّل دائمًا ولا يمكن إيقافه. عند إيقاف PayFor، تمر جميع التبرعات في كل العملات والسيناريوهات عبر Stripe فقط."
        icon={Settings}
      />

      {loading ? (
        <Card className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">جاري التحميل...</span>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-indigo-50 p-2 text-indigo-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-gray-900">
                      Stripe
                    </h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-xs font-medium">
                      مفعّل دائمًا
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    البوابة الافتراضية والاحتياطية لكل العملات. لا يمكن
                    إيقافها لأنها تضمن استمرار قبول التبرعات.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Lock className="w-4 h-4 text-gray-400" />
                <Switch checked disabled />
              </div>
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-amber-50 p-2 text-amber-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">
                    PayFor (3D Secure للّيرة التركية)
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    يُستخدم تلقائيًا للتبرعات بالليرة التركية (TRY) عبر تدفّق
                    3D Secure. عند الإيقاف، تتحوّل كل التبرعات إلى Stripe
                    حتى للّيرة التركية.
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
        </div>
      )}
    </div>
  );
}
