import type { MessageTriggerEvent } from "./dispatch";

export interface EventDefinition {
  event: MessageTriggerEvent;
  label: string;
  description: string;
  /** Whether donation context ({{donation.*}}) is available */
  hasDonation: boolean;
}

export const EVENT_CATALOG: EventDefinition[] = [
  {
    event: "DONATION_PAID",
    label: "تبرّع ناجح",
    description: "يُرسل عند نجاح الدفع وانتقال التبرّع إلى الحالة PAID.",
    hasDonation: true,
  },
  {
    event: "DONATION_FAILED",
    label: "تبرّع فاشل",
    description: "يُرسل عند فشل الدفع وانتقال التبرّع إلى الحالة FAILED.",
    hasDonation: true,
  },
  {
    event: "FIRST_DONATION",
    label: "أول تبرّع للمتبرع",
    description: "يُرسل بعد DONATION_PAID فقط عندما يكون هذا أول تبرّع ناجح للمتبرع.",
    hasDonation: true,
  },
  {
    event: "USER_REGISTERED",
    label: "تسجيل مستخدم جديد",
    description: "يُرسل بعد إنشاء الحساب — لا يحتوي على بيانات تبرّع.",
    hasDonation: false,
  },
  {
    event: "SUBSCRIPTION_CREATED",
    label: "اشتراك شهري جديد",
    description: "يُرسل عند إنشاء اشتراك تبرّع متكرّر.",
    hasDonation: false,
  },
  {
    event: "SUBSCRIPTION_PAYMENT",
    label: "تجديد اشتراك ناجح",
    description: "يُرسل عند نجاح خصم اشتراك متكرّر — يحوي بيانات التبرّعة المتولّدة.",
    hasDonation: true,
  },
  {
    event: "SUBSCRIPTION_CANCELLED",
    label: "إلغاء اشتراك",
    description: "يُرسل عند إلغاء اشتراك متكرّر.",
    hasDonation: false,
  },
];

export function getEventDefinition(e: MessageTriggerEvent): EventDefinition | undefined {
  return EVENT_CATALOG.find((d) => d.event === e);
}
