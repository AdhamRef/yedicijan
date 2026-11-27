"use client";

import { useLiveDonationRefresh } from "@/hooks/useLiveDonationRefresh";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useLocale } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  DollarSign,
  Heart,
  FolderTree,
  Wallet,
  Calendar,
  CalendarDays,
  Receipt,
  Target,
  Layers,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  ChevronDown,
  Loader2,
  HandCoins,
  Percent,
  Landmark,
  LayoutDashboard,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { CHART_THEME } from "@/lib/dashboard/chart-theme";
import { MetricSummaryBand } from "@/components/dashboard/MetricSummaryBand";
import {
  DashboardFilterBar,
  type ActiveFilterChip,
} from "@/components/dashboard/DashboardFilterBar";
import { useCurrency } from "@/context/CurrencyContext";
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";
import {
  createFormatDashboardMoney,
  donationDisplayTotalLocal,
  DASHBOARD_DISPLAY_SYMBOLS,
} from "@/lib/dashboard/format-dashboard-money";
import { formatIstanbulCalendarMonthLong } from "@/lib/admin/current-calendar-month-utc";
import { StatsMetricCard } from "@/components/dashboard/StatsMetricCard";
import MultiPick from "@/components/dashboard/MultiPick";
import { getDashboardChartPeriodLabelAr } from "@/lib/dashboard/chart-period-label-ar";
import { getPeriodDateKeys } from "@/lib/dashboard/period-date-range";
import {
  istanbulTodayKey,
  istanbulAddCalendarDaysKey,
  formatIstanbulDateKeyLabel,
} from "@/lib/dashboard/istanbul-client-date";
import { DonationTableCountryColumn } from "@/components/dashboard/DonationTableCountryColumn";
import { DonationSourceBadge } from "@/components/dashboard/DonationSourceBadge";
import { DonationsFilterActions } from "@/components/dashboard/DonationsFilterActions";
import { DonorSearchInput } from "@/components/dashboard/DonorSearchInput";
import { getCountryDisplayNameFromCode } from "@/lib/dashboard/country-display-name";
import {
  DashboardPieLegendByCount,
  DashboardPieLegendByValue,
} from "@/components/dashboard/DashboardPieLegend";
import { useViewUserProfile } from "@/context/ViewUserProfileContext";
import DonationDetailsDialog, { type DonationDetailsTarget } from "@/components/dashboard/DonationDetailsDialog";
import { ExportReportDialog, EXPORT_DEFAULTS, type ExportFormState } from "@/components/dashboard/ExportReportDialog";
import { useDonationActions } from "@/components/dashboard/donations/useDonationActions";
import { userCanEditDonations, userCanExportReports } from "@/lib/dashboard/permissions";
import { useSession } from "next-auth/react";

interface ChartDataPoint {
  date: string;
  amountUSD: number;
  count: number;
  amountFailed: number;
  countFailed: number;
  teamSupport: number;
  fees: number;
}

interface Category {
  id: string;
  name: string;
}

interface CampaignOption {
  id: string;
  title: string;
  // Many-to-many: a campaign can belong to multiple categories. `categoryId`
  // is the legacy single-value alias (first category) for backwards-compat.
  categoryId?: string;
  categoryIds?: string[];
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface DonationRow {
  id: string;
  totalAmount: number;
  amount: number;
  amountUSD?: number | null;
  currency: string;
  teamSupport: number;
  fees: number;
  status: string;
  paidAt?: string | null;
  provider?: string | null;
  providerOrderId?: string | null;
  providerErrorMessage?: string | null;
  paymentMethod?: string | null;
  attribution?: Record<string, unknown> | null;
  conversionEventsSentAt?: string | null;
  conversionFailedEventsSentAt?: string | null;
  createdAt: string;
  donor: { id: string; name: string | null; email: string };
  donorCountryCode?: string | null;
  campaigns: { id: string; title: string }[];
  categories: { id: string; name: string }[];
  referral: { id: string; code: string; name?: string | null } | null;
}

interface DashboardStats {
  totalCampaigns: number;
  totalCategories: number;
  totalDonations: number;
  totalUsers: number;
  totalAmount: number;
  allTimeRevenue?: number;
  /** Sum of all PAID donations (USD) — ignores period / category / campaign filters */
  paidRevenueAllTimeUnfiltered?: number;
  /** All-time companions to the above — safe to show beside a figure labelled "كل الوقت". */
  paidCountAllTimeUnfiltered?: number;
  paidCount?: number;
  failedCount?: number;
  failedTotalAmount?: number;
  thisMonthRevenue: number;
  campaignDonationsTotal: number;
  categoryDonationsTotal: number;
  campaignDonationsCount?: number;
  categoryDonationsCount?: number;
  teamSupportTotal?: number;
  feesTotal?: number;
  recentDonations: Array<{
    id: string;
    amount: number;
    currency: string;
    donorName: string;
    status?: string;
    provider?: string | null;
    campaignTitle: string | null;
    categoryName: string | null;
    createdAt: string;
  }>;
}

type ChartViewType = "bar" | "line" | "area";
type ChartPeriod = "day" | "yesterday" | "week" | "month" | "year" | "all" | "custom";
type ChartMetric = "amount" | "teamSupport" | "fees";
type StatCardSet = "revenue" | "overview";

const PERIOD_LABELS: Record<ChartPeriod, string> = {
  day: "اليوم",
  yesterday: "أمس",
  week: "أسبوع",
  month: "شهر",
  year: "سنة",
  all: "كل الوقت",
  custom: "مخصص",
};

// Was a local block of raw hex duplicated verbatim in another page and built on a generic
// blue rather than the brand colour. Aliased so every existing CHART_COLORS.* reference in
// this file keeps working while the values now come from one shared, brand-anchored palette.
const CHART_COLORS = {
  primary: CHART_THEME.primary,
  primaryLight: CHART_THEME.primaryLight,
  secondary: CHART_THEME.primaryDark,
  grid: CHART_THEME.grid,
  text: CHART_THEME.text,
};

const PAGE_SIZE = 10;

/** Returns { start, end } in YYYY-MM-DD for the donations API; null = no filter (all time) */
function getDonationsDateRange(
  period: ChartPeriod,
  dateFrom: string,
  dateTo: string
): { start: string | null; end: string | null } {
  // Calendar-aware semantics live in the shared helper — keep the in-file
  // adapter so existing callers don't have to thread the period type.
  return getPeriodDateKeys(period, dateFrom, dateTo);
}

/** Filters hold "all" or a comma-joined list ("a,b" = any of them; #282). */
const pickList = (v: string) => (v && v !== "all" ? v.split(",").filter(Boolean) : []);
const pickValue = (xs: string[]) => (xs.length ? xs.join(",") : "all");

export default function DashboardPage() {
  const locale = useLocale() as string;
  const thisMonthRevenueTitle = `إيرادات شهر ${formatIstanbulCalendarMonthLong(new Date(), locale || "ar")}`;
  const searchParams = useSearchParams();
  const { convertToCurrency, getSelectedCurrency } = useCurrency();

  /** Stats API + chart series are USD; scale for selected display currency */
  const convertUsdToDisplay = useCallback(
    (usd: number) => {
      const code = getSelectedCurrency?.() ?? "DEFAULT";
      if (code === "DEFAULT") return usd;
      const r = convertToCurrency(usd);
      return typeof r?.convertedValue === "number" ? r.convertedValue : usd;
    },
    [getSelectedCurrency, convertToCurrency]
  );

  /** Format values already in display currency (used for chart series after `convertUsdToDisplay`) */
  const formatInSelectedCurrency = useCallback(
    (n: number, approximate?: boolean) => {
      const selected = getSelectedCurrency?.() ?? "DEFAULT";
      const decimals = approximate
        ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
        : { minimumFractionDigits: 0, maximumFractionDigits: 2 };
      const val = typeof n === "number" ? (approximate ? Math.round(n) : n) : 0;
      if (selected === "DEFAULT") {
        const sym = DASHBOARD_DISPLAY_SYMBOLS.USD ?? "$";
        return sym + val.toLocaleString(undefined, decimals);
      }
      const sym = DASHBOARD_DISPLAY_SYMBOLS[selected] ?? `${selected} `;
      return sym + val.toLocaleString(undefined, decimals);
    },
    [getSelectedCurrency]
  );

  const [stats, setStats] = useState<DashboardStats | null>(null);
  // "Today" card: same filters as the indicators, but the period is always the
  // current Istanbul day and only settled (PAID) donations count as revenue.
  const [todayStats, setTodayStats] = useState<{ amount: number; count: number } | null>(null);
  const [todayError, setTodayError] = useState(false);
  const todayRequestId = useRef(0);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersSearchInput, setUsersSearchInput] = useState("");
  const [usersSearchCommitted, setUsersSearchCommitted] = useState("");
  const [usersSearchLoading, setUsersSearchLoading] = useState(false);
  const [statCardSet, setStatCardSet] = useState<StatCardSet>("revenue");

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");

  // Sync user filter from URL (e.g. from users page "تحليل تبرعات")
  useEffect(() => {
    const uid = searchParams.get("userId");
    if (uid && uid !== "all") {
      setSelectedUserId(uid);
      fetch(`/api/users/${uid}`)
        .then((r) => r.json())
        .then((data) => {
          const u = data?.user;
          if (u)
            setUsers((prev) => {
              if (prev.some((x) => x.id === u.id)) return prev;
              return [{ id: u.id, name: u.name ?? null, email: u.email ?? "" }, ...prev];
            });
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const displayChartData = useMemo(
    () =>
      chartData.map((d) => ({
        ...d,
        amountUSD: convertUsdToDisplay(d.amountUSD),
        amountFailed: convertUsdToDisplay(d.amountFailed),
        teamSupport: convertUsdToDisplay(d.teamSupport),
        fees: convertUsdToDisplay(d.fees),
      })),
    [chartData, convertUsdToDisplay]
  );

  const [chartLoading, setChartLoading] = useState(true);
  const [chartView, setChartView] = useState<ChartViewType>("bar");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("month");
  const [chartMetric, setChartMetric] = useState<ChartMetric>("amount");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [donationsSortBy, setDonationsSortBy] = useState<"date" | "amount">("date");
  const [donationsSortOrder, setDonationsSortOrder] = useState<"asc" | "desc">("desc");
  const [showFailed, setShowFailed] = useState(false);
  const [donationsStatusFilter, setDonationsStatusFilter] = useState<"all" | "PAID" | "FAILED">("all");
  /** Applied donor search (name or email) for the أحدث التبرعات table — server-side, not a page filter. */
  const [donationsSearch, setDonationsSearch] = useState("");
  // "all", one locale, or several joined by commas (#282).
  const [donationLocaleFilter, setDonationLocaleFilter] = useState<string>("all");
  const [donationCountryFilter, setDonationCountryFilter] = useState<string>("all");
  const [donationSourceFilter, setDonationSourceFilter] = useState("all");

  // Saved filter sets: the author's own, plus those shared with the team (#283).
  type SavedView = { id: string; name: string; filters: Record<string, string>; shared: boolean; mine: boolean; ownerName: string | null };
  const [savedViews, setSavedViews] = useState<SavedView[]>([]), [activeViewId, setActiveViewId] = useState("");
  const loadViews = useCallback(() => {
    fetch("/api/admin/dashboard-views", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then((d) => { if (d?.views) setSavedViews(d.views as SavedView[]); }).catch(() => {});
  }, []);
  useEffect(() => { loadViews(); }, [loadViews]);
  const currentFilters = (): Record<string, string> => ({ selectedCategory, selectedCampaign, donationSourceFilter, donationLocaleFilter, donationCountryFilter, donationsStatusFilter, chartPeriod, dateFrom, dateTo });
  const applyView = (v: SavedView) => {
    const vf = v.filters;
    if (vf.selectedCategory) setSelectedCategory(vf.selectedCategory);
    if (vf.selectedCampaign) setSelectedCampaign(vf.selectedCampaign);
    if (vf.donationSourceFilter) setDonationSourceFilter(vf.donationSourceFilter);
    if (vf.donationLocaleFilter) setDonationLocaleFilter(vf.donationLocaleFilter);
    if (vf.donationCountryFilter) setDonationCountryFilter(vf.donationCountryFilter);
    if (vf.donationsStatusFilter === "all" || vf.donationsStatusFilter === "PAID" || vf.donationsStatusFilter === "FAILED") setDonationsStatusFilter(vf.donationsStatusFilter);
    if (vf.chartPeriod && vf.chartPeriod in PERIOD_LABELS) setChartPeriod(vf.chartPeriod as ChartPeriod);
    setDateFrom(vf.dateFrom ?? ""); setDateTo(vf.dateTo ?? "");
  };
  const saveView = async () => {
    const name = window.prompt("اسم العرض (مثلاً: متبرعو تركيا عبر فيسبوك)");
    if (!name?.trim()) return;
    const shared = window.confirm("مشاركة هذا العرض مع الفريق؟ (موافق = مشترك، إلغاء = لي فقط)");
    await fetch("/api/admin/dashboard-views", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), filters: currentFilters(), shared }) }).catch(() => undefined);
    loadViews();
  };
  const deleteView = async () => {
    const v = savedViews.find((x) => x.id === activeViewId);
    if (!v || !v.mine || !window.confirm(`حذف العرض «${v.name}»؟`)) return;
    await fetch(`/api/admin/dashboard-views?id=${v.id}`, { method: "DELETE" }).catch(() => undefined);
    setActiveViewId(""); loadViews();
  };
  const [countryOptions, setCountryOptions] = useState<{ code: string; count: number }[]>([]);
  const [countryUnsetCount, setCountryUnsetCount] = useState(0);

  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [donationsPage, setDonationsPage] = useState(1);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationsFetchedOnce, setDonationsFetchedOnce] = useState(false);
  const [donationDetails, setDonationDetails] = useState<{
    open: boolean;
    mode: "attribution" | "payment" | "error";
    donation: DonationDetailsTarget | null;
  }>({ open: false, mode: "attribution", donation: null });
  const openDonationDetails = (mode: "attribution" | "payment" | "error", d: DonationRow) => {
    setDonationDetails({
      open: true,
      mode,
      donation: {
        id: d.id,
        provider: d.provider ?? null,
        providerOrderId: d.providerOrderId ?? null,
        providerErrorMessage: d.providerErrorMessage ?? null,
        paymentMethod: d.paymentMethod ?? null,
        attribution: d.attribution ?? null,
        conversionEventsSentAt: d.conversionEventsSentAt ?? null,
        conversionFailedEventsSentAt: d.conversionFailedEventsSentAt ?? null,
        status: d.status ?? null,
      },
    });
  };

  const chartFilterPeriodLabelAr = useMemo(
    () => getDashboardChartPeriodLabelAr(chartPeriod, dateFrom, dateTo),
    [chartPeriod, dateFrom, dateTo]
  );

  // Fetch categories and campaigns
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const lc = locale || "ar";
        const [categoriesRes, campaignsRes] = await Promise.all([
          fetch(`/api/categories?locale=${lc}&counts=true&limit=200`),
          fetch(`/api/campaigns/all?locale=${lc}&isActiveFalse=true`),
        ]);
        const categoriesJson = await categoriesRes.json();
        const campaignsJson = await campaignsRes.json();
        setCategories(categoriesJson?.items ?? categoriesJson ?? []);
        setCampaigns(campaignsJson?.items ?? campaignsJson ?? []);
      } catch (error) {
        console.error("Error fetching filters:", error);
      }
    };
    fetchFilters();
  }, [locale]);

  // Fetch distinct donor countries for the country filter dropdown
  const fetchCountries = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/donations/countries");
      if (!res.ok) return;
      const data = await res.json();
      setCountryOptions(Array.isArray(data?.countries) ? data.countries : []);
      setCountryUnsetCount(Number(data?.unsetCount) || 0);
    } catch (error) {
      console.error("Error fetching donor countries:", error);
    }
  }, []);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const commitUsersSearch = useCallback(() => {
    setUsersSearchCommitted(usersSearchInput.trim());
  }, [usersSearchInput]);

  // Donor search runs only after Enter / search click (usersSearchCommitted)
  useEffect(() => {
    if (!usersSearchCommitted) return;
    const controller = new AbortController();
    setUsersSearchLoading(true);
    const run = async () => {
      try {
        const res = await fetch(
          `/api/users?search=${encodeURIComponent(usersSearchCommitted)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok) {
          toast.error(typeof data?.error === "string" ? data.error : "فشل البحث عن المستخدمين");
          setUsers([]);
          return;
        }
        setUsers(data.users ?? []);
      } catch (e) {
        if ((e as { name?: string }).name !== "AbortError") setUsers([]);
      } finally {
        setUsersSearchLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [usersSearchCommitted]);

  // When not in "search results" mode, keep list small so selected donor still shows a label
  useEffect(() => {
    if (usersSearchCommitted) return;
    if (selectedUserId === "all") {
      setUsers([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/users/${selectedUserId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const u = data?.user;
        if (u)
          setUsers([{ id: u.id, name: u.name ?? null, email: u.email ?? "" }]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [usersSearchCommitted, selectedUserId]);

  // Chart data (filters + period + from/to + user — user from state or URL when coming via link)
  const fetchChartData = useCallback(async () => {
    const userIdFromUrl = searchParams.get("userId");
    const effectiveUserId = selectedUserId !== "all" ? selectedUserId : (userIdFromUrl && userIdFromUrl !== "all" ? userIdFromUrl : "all");
    setChartLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("period", chartPeriod);
      // Compute the explicit Istanbul date range for every preset (not just
      // custom) so the chart endpoint uses the same calendar semantics as the
      // donations table — اليوم = today only, أمس = yesterday, شهر = first of
      // the month → today, سنة = Jan 1 → today.
      const { start, end } = getDonationsDateRange(chartPeriod, dateFrom, dateTo);
      if (start && end) {
        params.set("start", start);
        params.set("end", end);
      }
      if (selectedCategory !== "all") params.append("categoryId", selectedCategory);
      if (selectedCampaign !== "all") params.append("campaignId", selectedCampaign);
      if (effectiveUserId !== "all") params.append("userId", effectiveUserId);
      if (showFailed) params.set("showFailed", "true");
      if (donationLocaleFilter !== "all") params.set("locale", donationLocaleFilter);
      if (donationCountryFilter !== "all") params.set("country", donationCountryFilter);
      if (donationSourceFilter !== "all") params.set("source", donationSourceFilter);
      const response = await axios.get(`/api/admin/donations/chart?${params}`);
      setChartData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching chart data:", error);
      toast.error("فشل في تحميل بيانات التبرعات");
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  }, [selectedCategory, selectedCampaign, selectedUserId, searchParams, chartPeriod, dateFrom, dateTo, showFailed, donationLocaleFilter, donationCountryFilter, donationSourceFilter]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  // Stats — affected by فترة (period + dateFrom/dateTo) and category/campaign filters
  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("period", chartPeriod);
      const { start, end } = getDonationsDateRange(chartPeriod, dateFrom, dateTo);
      if (start && end) {
        params.set("start", start);
        params.set("end", end);
      }
      if (selectedCategory !== "all") params.set("categoryId", selectedCategory);
      if (selectedCampaign !== "all") params.set("campaignId", selectedCampaign);
      if (donationLocaleFilter !== "all") params.set("locale", donationLocaleFilter);
      if (donationCountryFilter !== "all") params.set("country", donationCountryFilter);
      if (donationSourceFilter !== "all") params.set("source", donationSourceFilter);
      const response = await fetch(`/api/admin/stats?${params}`);
      const data = await response.json();
      if (!response.ok) {
        const message = data?.details || data?.error || "فشل في تحميل إحصائيات لوحة التحكم";
        toast.error(message);
        return;
      }
      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("فشل في تحميل إحصائيات لوحة التحكم");
    } finally {
      setLoading(false);
    }
  }, [chartPeriod, dateFrom, dateTo, selectedCategory, selectedCampaign, donationLocaleFilter, donationCountryFilter, donationSourceFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchTodayStats = useCallback(async () => {
    const requestId = ++todayRequestId.current;
    setTodayError(false);
    setTodayStats(null);
    try {
      const today = istanbulTodayKey();
      const params = new URLSearchParams({ period: "day", start: today, end: today });
      if (selectedCategory !== "all") params.set("categoryId", selectedCategory);
      if (selectedCampaign !== "all") params.set("campaignId", selectedCampaign);
      if (donationLocaleFilter !== "all") params.set("locale", donationLocaleFilter);
      if (donationCountryFilter !== "all") params.set("country", donationCountryFilter);
      if (donationSourceFilter !== "all") params.set("source", donationSourceFilter);
      const response = await fetch(`/api/admin/stats?${params}`);
      const data = await response.json();
      if (requestId !== todayRequestId.current) return;
      if (!response.ok) throw new Error(data?.error || "stats failed");
      setTodayStats({ amount: Number(data?.totalAmount ?? 0), count: Number(data?.paidCount ?? 0) });
    } catch (error) {
      if (requestId !== todayRequestId.current) return;
      console.error("Error fetching today's stats:", error);
      setTodayError(true);
    }
  }, [selectedCategory, selectedCampaign, donationLocaleFilter, donationCountryFilter, donationSourceFilter]);

  useEffect(() => {
    fetchTodayStats();
  }, [fetchTodayStats]);

  // Donations list — uses تصفية النتائج + chart time span (period + from/to) + sort
  const fetchDonations = useCallback(
    async (page: number, append: boolean, quiet = false) => {
      // A quiet refresh (live update) keeps the list on screen and stays silent on errors.
      if (!quiet) setDonationsLoading(true);
      try {
        const { start, end } = getDonationsDateRange(chartPeriod, dateFrom, dateTo);
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(PAGE_SIZE));
        params.set("sortBy", donationsSortBy);
        params.set("sortOrder", donationsSortOrder);
        if (selectedCategory !== "all") params.append("categoryId", selectedCategory);
        if (selectedCampaign !== "all") params.append("campaignId", selectedCampaign);
        if (selectedUserId !== "all") params.append("userId", selectedUserId);
        if (start) params.set("start", start);
        if (end) params.set("end", end);
        if (donationsStatusFilter !== "all") params.set("status", donationsStatusFilter);
        if (donationLocaleFilter !== "all") params.set("locale", donationLocaleFilter);
        if (donationCountryFilter !== "all") params.set("country", donationCountryFilter);
        if (donationSourceFilter !== "all") params.set("source", donationSourceFilter);
        if (donationsSearch) params.set("search", donationsSearch);
        const res = await fetch(`/api/donations?${params}`);
        const data = await res.json();
        if (!res.ok) {
          if (!quiet) toast.error(data?.error || "فشل في تحميل التبرعات");
          return;
        }
        const list = Array.isArray(data.donations) ? data.donations : [];
        setDonations((prev) => (append ? [...prev, ...list] : list));
        setDonationsTotal(data.pagination?.total ?? 0);
      } catch (error) {
        console.error("Error fetching donations:", error);
        if (!quiet) toast.error("فشل في تحميل التبرعات");
      } finally {
        if (!quiet) setDonationsLoading(false);
        setDonationsFetchedOnce(true);
      }
    },
    [
      selectedCategory,
      selectedCampaign,
      selectedUserId,
      chartPeriod,
      dateFrom,
      dateTo,
      donationsSortBy,
      donationsSortOrder,
      donationsStatusFilter,
      donationLocaleFilter,
      donationCountryFilter,
      donationSourceFilter,
      donationsSearch,
    ]
  );

  // Fetch donations when filters or time span or sort change
  useEffect(() => {
    if (loading) return;
    setDonationsPage(1);
    fetchDonations(1, false);
  }, [loading, selectedCategory, selectedCampaign, selectedUserId, chartPeriod, dateFrom, dateTo, donationsSortBy, donationsSortOrder, donationsStatusFilter, donationLocaleFilter, donationCountryFilter, donationsSearch, fetchDonations]);

  // Live: the latest donations refresh every 30 s while the tab is visible, on focus, and
  // after an edit elsewhere — only on the first page, so "load more" is never reset.
  useLiveDonationRefresh(() => fetchDonations(1, false, true), !loading && donationsPage === 1);

  const loadMoreDonations = () => {
    const next = donationsPage + 1;
    setDonationsPage(next);
    fetchDonations(next, true);
  };

  const hasMoreDonations =
    donations.length < donationsTotal && !donationsLoading;

  const formatMoney = useMemo(
    () =>
      createFormatDashboardMoney({
        getSelectedCurrency,
        convertToCurrency,
      }),
    [getSelectedCurrency, convertToCurrency]
  );

  const { openUserProfile } = useViewUserProfile();

  // Right-click edit/delete on donation rows. Gated on the new `donationsEdit`
  // permission so STAFF only gets it when explicitly granted. ADMIN always.
  const { data: sessionForActions } = useSession();
  const canEditDonations = userCanEditDonations(sessionForActions?.user);
  const canExportReports = userCanExportReports(sessionForActions?.user);
  const refreshAfterDonationMutation = useCallback(() => {
    setDonationsPage(1);
    void Promise.all([
      fetchDonations(1, false),
      fetchStats(),
      fetchTodayStats(),
      fetchChartData(),
      fetchCountries(),
    ]);
  }, [fetchDonations, fetchStats, fetchTodayStats, fetchChartData, fetchCountries]);
  const donationActions = useDonationActions({
    enabled: canEditDonations,
    onChange: refreshAfterDonationMutation,
  });

  // ── Export dialog state (popup with full filter setup before download) ─────
  const [exportOpen, setExportOpen] = useState(false);
  const exportDefaults: ExportFormState = useMemo(() => {
    const { start, end } = getDonationsDateRange(chartPeriod, dateFrom, dateTo);
    // Send "custom" with the Istanbul range we already computed for every
    // preset other than "all". The export dialog's built-in day/week/month
    // computation runs in the browser's local timezone and assumes "last N
    // days", which now disagrees with the calendar-day semantics on screen
    // (اليوم = today only, شهر = from the 1st, etc.).
    return {
      ...EXPORT_DEFAULTS,
      period: chartPeriod === "all" ? "all" : "custom",
      start: start ?? "",
      end: end ?? "",
      categoryId: selectedCategory,
      campaignId: selectedCampaign,
      status: donationsStatusFilter,
      locale: donationLocaleFilter === "all" ? "all" : String(donationLocaleFilter),
      country: donationCountryFilter,
      source: donationSourceFilter,
      sortBy: donationsSortBy,
      sortOrder: donationsSortOrder,
    };
  }, [
    chartPeriod,
    dateFrom,
    dateTo,
    selectedCategory,
    selectedCampaign,
    donationsStatusFilter,
    donationLocaleFilter,
    donationCountryFilter,
    donationSourceFilter,
    donationsSortBy,
    donationsSortOrder,
  ]);

  const exportCategoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.name })),
    [categories]
  );
  const exportCampaignOptions = useMemo(
    () => campaigns.map((c) => ({ value: c.id, label: c.title })),
    [campaigns]
  );
  const exportCountryOptions = useMemo(
    () => countryOptions.map((c) => ({ value: c.code, label: c.code })),
    [countryOptions]
  );
  const exportLocaleOptions = useMemo(
    () => [
      { value: "ar", label: "العربية" },
      { value: "en", label: "English" },
      { value: "tr", label: "Türkçe" },
      { value: "fr", label: "Français" },
      { value: "id", label: "Bahasa" },
      { value: "pt", label: "Português" },
      { value: "es", label: "Español" },
      { value: "de", label: "Deutsch" },
    ],
    []
  );

  if (loading) {
    return <LoadingSkeleton />;
  }

  const revenueSplitData = [
    {
      name: "مشاريع",
      value: stats?.campaignDonationsTotal ?? 0,
      count: stats?.campaignDonationsCount ?? 0,
      color: "#2563eb",
    },
    {
      name: "فئات",
      value: stats?.categoryDonationsTotal ?? 0,
      count: stats?.categoryDonationsCount ?? 0,
      color: "#64748b",
    },
  ].filter((d) => d.value > 0 || d.count > 0);

  const paidFailedSplitData = [
    {
      name: "مدفوعة",
      value: stats?.totalAmount ?? 0,
      count: stats?.paidCount ?? 0,
      color: "#22c55e",
    },
    {
      name: "فاشلة",
      value: stats?.failedTotalAmount ?? 0,
      count: stats?.failedCount ?? 0,
      color: "#ef4444",
    },
  ].filter((d) => d.value > 0 || d.count > 0);

  return (
    <div className="min-h-0" dir="rtl">
      <div className="space-y-6 sm:space-y-8 p-0 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
        <PageHeader
          title="تحليل الإيرادات"
          icon={LayoutDashboard}
          description={
            searchParams.get("userId") ? (
              <>
                عرض تبرعات:{" "}
                <span className="font-medium text-slate-900 whitespace-normal break-words">
                  {users.find((u) => u.id === searchParams.get("userId"))?.name ||
                    users.find((u) => u.id === searchParams.get("userId"))?.email ||
                    "جاري التحميل..."}
                </span>
              </>
            ) : (
              "نظرة شاملة على الإيرادات، التبرعات والتحليلات"
            )
          }
        />




        {/* Summary band. Establishes which number matters before the filtered KPI grid, but
            stays on the neutral surface the rest of the shell uses — a coloured slab here
            fights the content instead of framing it. */}
        {!searchParams.get("userId") && (
          <MetricSummaryBand
            icon={Wallet}
            eyebrow="إجمالي الإيرادات الناجحة"
            badge="كل الوقت"
            value={formatInSelectedCurrency(
              stats?.paidRevenueAllTimeUnfiltered ??
                stats?.allTimeRevenue ??
                stats?.totalAmount ??
                0,
            )}
            note="لا تتأثر هذه القيمة ولا البطاقات المجاورة بالفترة أو التصفية المختارة أدناه."
            stats={[
              // No hints here: the badge already says كل الوقت. In a single-row band every
              // extra word is height the charts below lose.
              {
                label: "عدد التبرعات الناجحة",
                icon: HandCoins,
                value: (stats?.paidCountAllTimeUnfiltered ?? 0).toLocaleString("en-US"),
              },
              {
                label: "المشاريع",
                icon: Heart,
                value: (stats?.totalCampaigns ?? 0).toLocaleString("en-US"),
              },
              {
                label: "إجمالي المستخدمين",
                icon: Users,
                value: (stats?.totalUsers ?? 0).toLocaleString("en-US"),
              },
            ]}
          />
        )}


        {/* المؤشرات — تختفي عند عرض تبرعات مستخدم معين عبر الرابط */}
        {!searchParams.get("userId") && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                <PieChartIcon className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold leading-tight text-slate-900">المؤشرات</h2>
                <p className="text-xs text-slate-500">محسوبة حسب الفترة والتصفية المختارة</p>
              </div>
            </div>
            <Tabs
              value={statCardSet}
              onValueChange={(v) => setStatCardSet(v as StatCardSet)}
              className="w-auto"
            >
              <TabsList className="bg-muted p-1 rounded-lg h-9" dir="rtl">
                <TabsTrigger
                  value="revenue"
                  className="text-xs px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  الإيرادات
                </TabsTrigger>
                <TabsTrigger
                  value="overview"
                  className="text-xs px-3 data-[state=active]:bg-card data-[state=active]:shadow-sm"
                >
                  نظرة عامة
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4">
            {statCardSet === "revenue" && (
              <>
                <StatsMetricCard
                  compact
                  title="إيرادات ناجحة (اليوم)"
                  value={todayStats?.amount ?? 0}
                  icon={CalendarDays}
                  accent="teal"
                  format="money"
                  subtitle={todayError ? "تعذر تحميل أرقام اليوم" : todayStats ? `عدد: ${todayStats.count.toLocaleString("en-US")} · اليوم فقط (بتوقيت إسطنبول)، بنفس التصفية` : "…"}
                />
                <StatsMetricCard
                  compact
                  title={thisMonthRevenueTitle}
                  value={stats?.thisMonthRevenue ?? 0}
                  icon={Calendar}
                  accent="emerald"
                  format="money"
                  variant="hero"
                  subtitle="دفعات ناجحة في الشهر الحالي (UTC)"
                />
                <StatsMetricCard
                  compact
                  title={`إيرادات ناجحة (${chartFilterPeriodLabelAr})`}
                  value={stats?.totalAmount ?? 0}
                  icon={DollarSign}
                  accent="emerald"
                  format="money"
                  subtitle="مجموع التبرعات المدفوعة فقط — حسب الفترة والتصفية أعلاه"
                />
                <StatsMetricCard
                  compact
                  title="إيرادات ناجحة (كل الوقت)"
                  value={stats?.paidRevenueAllTimeUnfiltered ?? 0}
                  icon={DollarSign}
                  accent="emerald"
                  format="money"
                  subtitle="جميع التبرعات الناجحة بشكل عام دون فلتر"
                />
                <StatsMetricCard
                  compact
                  title="دعم الفريق"
                  value={stats?.teamSupportTotal ?? 0}
                  icon={HandCoins}
                  accent="amber"
                  format="money"
                  subtitle={`من التبرعات الناجحة (${chartFilterPeriodLabelAr})`}
                />
                {/* <StatsMetricCard
                  compact
                  title="الرسوم"
                  value={stats?.feesTotal ?? 0}
                  icon={Percent}
                  accent="orange"
                  format="money"
                  subtitle={`من التبرعات الناجحة (${chartFilterPeriodLabelAr})`}
                /> */}
                <StatsMetricCard
                  compact
                  title="تبرعات ناجحة"
                  value={stats?.paidCount ?? 0}
                  icon={Receipt}
                  accent="teal"
                  subtitle={`إجمالي مبالغ ناجحة: ${formatMoney(stats?.totalAmount ?? 0, undefined, undefined, true)}`}
                />
                <StatsMetricCard
                  compact
                  title="تبرعات فاشلة"
                  value={stats?.failedCount ?? 0}
                  icon={Receipt}
                  accent="orange"
                  subtitle={stats?.failedTotalAmount ? formatMoney(stats.failedTotalAmount, undefined, undefined, true) : "—"}
                />
              </>
            )}
            {statCardSet === "overview" && (
              <>
                <StatsMetricCard
                  compact
                  title="المشاريع"
                  value={stats?.totalCampaigns ?? 0}
                  icon={Heart}
                  accent="teal"
                />
                <StatsMetricCard
                  compact
                  title="الفئات"
                  value={stats?.totalCategories ?? 0}
                  icon={FolderTree}
                  accent="indigo"
                />
                <StatsMetricCard
                  compact
                  title="المستخدمين"
                  value={stats?.totalUsers ?? 0}
                  icon={Users}
                  accent="amber"
                />
                <StatsMetricCard
                  compact
                  title="عدد التبرعات"
                  value={stats?.totalDonations ?? 0}
                  icon={Receipt}
                  accent="violet"
                />
              </>
            )}
          </div>
        </section>
        )}

        {/* التحليلات */}
        <section className="space-y-4">
          <Card className="border-border shadow-sm">
            <CardContent className="pt-6">
              <Tabs defaultValue="time-series" className="w-full" dir="rtl">


                <TabsContent value="time-series" className="mt-0" dir="rtl">
                  <div className="h-[400px] w-full">
                    {chartLoading ? (
                      <div className="h-full flex items-center justify-center bg-slate-50 rounded-lg">
                        <Loader2 className="w-9 h-9 animate-spin text-brand" />
                      </div>
                    ) : chartView === "bar" ? (
                      chartMetric === "amount" ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={displayChartData}
                            barCategoryGap="16%"
                            barGap={6}
                            margin={{ top: 10, right: 24, left: 10, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                              tickFormatter={(v) =>
                                formatIstanbulDateKeyLabel(v, "en-US", {
                                  day: "numeric",
                                  month: "short",
                                })
                              }
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                              tickFormatter={(v) => formatInSelectedCurrency(Number(v))}
                              domain={[0, "auto"]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                              }}
                              labelFormatter={(v) =>
                                formatIstanbulDateKeyLabel(v, "en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              }
                              formatter={(value: number, name: string) => {
                                if (name === "amountUSD") return [formatInSelectedCurrency(Number(value), true), "مبلغ ناجح"];
                                if (name === "amountFailed") return [formatInSelectedCurrency(Number(value), true), "مبلغ فاشل"];
                                return [formatInSelectedCurrency(Number(value), true), name];
                              }}
                              content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const point = displayChartData.find((d) => d.date === label);
                                const isAmount = (key: string) => key === "amountUSD" || key === "amountFailed" || key === "مبلغ ناجح" || key === "مبلغ فاشل";
                                return (
                                  <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-sm">
                                    <p className="text-sm font-medium text-slate-700 mb-1.5">
                                      {label ? formatIstanbulDateKeyLabel(String(label), "ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : ""}
                                    </p>
                                    {payload.map((entry) => {
                                      const dataKey = (entry as { dataKey?: string }).dataKey ?? entry.name;
                                      const showAsMoney = isAmount(String(dataKey)) || isAmount(String(entry.name));
                                      return (
                                        <p key={String(entry.name)} className="text-sm text-slate-600" style={{ color: entry.color }}>
                                          {entry.name}: {showAsMoney ? formatInSelectedCurrency(Number(entry.value), true) : String(entry.value)}
                                        </p>
                                      );
                                    })}
                                    {point != null && (
                                      <>
                                        <p className="text-sm font-medium text-slate-700 mt-1.5 pt-1 border-t border-slate-100">
                                          الإجمالي: {formatInSelectedCurrency(Number(point.amountUSD ?? 0), true)}
                                        </p>
                                        <p className="text-sm text-slate-500 mt-0.5">
                                          عدد التبرعات: {Math.round(Number(point.count))}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                );
                              }}
                            />
                            <Legend />
                            <Bar
                              dataKey="amountUSD"
                              fill="#3b82f6"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={32}
                              name="مبلغ ناجح"
                            />
                            {showFailed && (
                              <Bar
                                dataKey="amountFailed"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={32}
                                name="مبلغ فاشل"
                              />
                            )}
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart
                            data={displayChartData}
                            barCategoryGap="20%"
                            barGap={8}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                            <XAxis
                              dataKey="date"
                              tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                              tickFormatter={(v) =>
                                formatIstanbulDateKeyLabel(v, "en-US", {
                                  day: "numeric",
                                  month: "short",
                                })
                              }
                              interval="preserveStartEnd"
                            />
                            <YAxis
                              yAxisId="amount"
                              orientation="left"
                              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                              tickFormatter={(v) => formatInSelectedCurrency(Number(v))}
                              domain={[0, "auto"]}
                            />
                            <YAxis
                              yAxisId="count"
                              orientation="right"
                              tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                              tickFormatter={(v) => String(Math.round(Number(v)))}
                              domain={[0, "auto"]}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "8px",
                                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                              }}
                              labelFormatter={(v) =>
                                formatIstanbulDateKeyLabel(v, "en-US", {
                                  weekday: "long",
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                })
                              }
                              formatter={(value: number, name: string) => {
                                if (name === "count" || name === "عدد التبرعات") return [String(Math.round(Number(value))), "عدد التبرعات"];
                                if (chartMetric === "teamSupport") return [formatInSelectedCurrency(Number(value), true), "دعم الفريق"];
                                if (chartMetric === "fees") return [formatInSelectedCurrency(Number(value), true), "الرسوم"];
                                return [String(Math.round(Number(value))), "العدد"];
                              }}
                            />
                            <Legend />
                            <Bar
                              yAxisId="amount"
                              dataKey={chartMetric}
                              fill={chartMetric === "teamSupport" ? "#f59e0b" : "#ea580c"}
                              radius={[4, 4, 0, 0]}
                              maxBarSize={36}
                              name={chartMetric === "teamSupport" ? "دعم الفريق" : "الرسوم"}
                            />
                            <Line
                              yAxisId="count"
                              type="monotone"
                              dataKey="count"
                              stroke="#0f766e"
                              strokeWidth={2}
                              dot={false}
                              name="عدد التبرعات"
                            />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )
                    ) : chartView === "line" ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={displayChartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={CHART_COLORS.grid}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                            tickFormatter={(v) =>
                              formatIstanbulDateKeyLabel(v, "en-US", {
                                day: "numeric",
                                month: "short",
                              })
                            }
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            yAxisId="amount"
                            orientation="right"
                            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                            tickFormatter={(v) => formatInSelectedCurrency(Number(v))}
                          />
                          <YAxis
                            yAxisId="count"
                            orientation="left"
                            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                            tickFormatter={(v) => String(Math.round(Number(v)))}
                            domain={[0, "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                            labelFormatter={(v) =>
                              formatIstanbulDateKeyLabel(v, "en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            }
                            formatter={(value: number, name: string) => {
                              if (name === "count" || name === "عدد التبرعات") return [String(Math.round(Number(value))), "عدد التبرعات"];
                              if (chartMetric === "amount") return [formatInSelectedCurrency(Number(value), true), "المبلغ"];
                              if (chartMetric === "teamSupport") return [formatInSelectedCurrency(Number(value), true), "دعم الفريق"];
                              if (chartMetric === "fees") return [formatInSelectedCurrency(Number(value), true), "الرسوم"];
                              return [String(Math.round(Number(value))), "العدد"];
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="amount"
                            type="monotone"
                            dataKey={chartMetric === "amount" ? "amountUSD" : chartMetric}
                            stroke={
                              chartMetric === "amount"
                                ? "#2563eb"
                                : chartMetric === "teamSupport"
                                  ? "#f59e0b"
                                  : "#ea580c"
                            }
                            strokeWidth={2}
                            dot={false}
                            name={
                              chartMetric === "amount"
                                ? "المبلغ"
                                : chartMetric === "teamSupport"
                                  ? "دعم الفريق"
                                  : "الرسوم"
                            }
                          />
                          <Line
                            yAxisId="count"
                            type="monotone"
                            dataKey="count"
                            stroke="#0f766e"
                            strokeWidth={2}
                            dot={false}
                            name="عدد التبرعات"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={displayChartData}>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={CHART_COLORS.grid}
                          />
                          <XAxis
                            dataKey="date"
                            tick={{ fill: CHART_COLORS.text, fontSize: 12 }}
                            tickFormatter={(v) =>
                              formatIstanbulDateKeyLabel(v, "en-US", {
                                day: "numeric",
                                month: "short",
                              })
                            }
                            interval="preserveStartEnd"
                          />
                          <YAxis
                            yAxisId="amount"
                            orientation="right"
                            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                            tickFormatter={(v) => formatInSelectedCurrency(Number(v))}
                          />
                          <YAxis
                            yAxisId="count"
                            orientation="left"
                            tick={{ fill: CHART_COLORS.text, fontSize: 11 }}
                            tickFormatter={(v) => String(Math.round(Number(v)))}
                            domain={[0, "auto"]}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                            }}
                            labelFormatter={(v) =>
                              formatIstanbulDateKeyLabel(v, "en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            }
                            formatter={(value: number, name: string) => {
                              if (name === "count" || name === "عدد التبرعات") return [String(Math.round(Number(value))), "عدد التبرعات"];
                              if (chartMetric === "amount") return [formatInSelectedCurrency(Number(value), true), "المبلغ"];
                              if (chartMetric === "teamSupport") return [formatInSelectedCurrency(Number(value), true), "دعم الفريق"];
                              if (chartMetric === "fees") return [formatInSelectedCurrency(Number(value), true), "الرسوم"];
                              return [String(Math.round(Number(value))), "العدد"];
                            }}
                          />
                          <Legend />
                          <Area
                            yAxisId="amount"
                            type="monotone"
                            dataKey={chartMetric === "amount" ? "amountUSD" : chartMetric}
                            stroke={
                              chartMetric === "amount"
                                ? "#2563eb"
                                : chartMetric === "teamSupport"
                                  ? "#f59e0b"
                                  : "#ea580c"
                            }
                            fill={
                              chartMetric === "amount"
                                ? "#93c5fd"
                                : chartMetric === "teamSupport"
                                  ? "#fcd34d"
                                  : "#fdba74"
                            }
                            fillOpacity={0.4}
                            strokeWidth={2}
                            name={
                              chartMetric === "amount"
                                ? "المبلغ"
                                : chartMetric === "teamSupport"
                                  ? "دعم الفريق"
                                  : "الرسوم"
                            }
                          />
                          <Line
                            yAxisId="count"
                            type="monotone"
                            dataKey="count"
                            stroke="#0f766e"
                            strokeWidth={2}
                            dot={false}
                            name="عدد التبرعات"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="split" className="mt-0" dir="rtl">
                  <Tabs defaultValue="paid-failed" className="w-full" dir="rtl">
                    <TabsList className="bg-slate-100 p-1 rounded-lg mb-4 inline-flex flex-row-reverse">
                      <TabsTrigger
                        value="campaign-category"
                        className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm"
                      >
                        مشاريع vs فئات
                      </TabsTrigger>
                      <TabsTrigger
                        value="paid-failed"
                        className="data-[state=active]:bg-card data-[state=active]:shadow-sm text-sm"
                      >
                        مقبول vs فاشل
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="campaign-category" className="mt-0">
                      <div className="h-[340px] w-full flex items-center justify-center">
                        {revenueSplitData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={revenueSplitData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                                nameKey="name"
                                label={false}
                              >
                                {revenueSplitData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, _name: string, props: { payload?: { count?: number } }) => {
                                  const count = props?.payload?.count ?? 0;
                                  return [
                                    `${formatMoney(Number(value), undefined, undefined, true)} — عدد: ${count}`,
                                    "المبلغ / العدد",
                                  ];
                                }}
                              />
                              <Legend content={DashboardPieLegendByValue as never} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-slate-500">لا توجد بيانات</p>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="paid-failed" className="mt-0" dir="rtl">
                      <div className="h-[340px] w-full flex items-center justify-center">
                        {paidFailedSplitData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={paidFailedSplitData}
                                cx="50%"
                                cy="50%"
                                innerRadius={70}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="count"
                                nameKey="name"
                                label={false}
                              >
                                {paidFailedSplitData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(value: number, _name: string, props: { payload?: { value?: number; count?: number } }) => {
                                  const amount = props?.payload?.value ?? 0;
                                  return [
                                    `عدد: ${value}${amount > 0 ? ` — ${formatMoney(Number(amount), undefined, undefined, true)}` : ""}`,
                                    "التبرعات",
                                  ];
                                }}
                              />
                              <Legend content={DashboardPieLegendByCount as never} />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-slate-500">لا توجد بيانات</p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </TabsContent>
                <div className="flex items-center gap-4 mt-6 flex-row-reverse flex-wrap">
                  <TabsList className="bg-slate-100 p-1 rounded-lg flex-row-reverse max-w-max">
                    <TabsTrigger
                      value="split"
                      className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"
                    >
                      <PieChartIcon className="w-4 h-4" />
                      توزيع الإيرادات
                    </TabsTrigger>
                    <TabsTrigger
                      value="time-series"
                      className="data-[state=active]:bg-card data-[state=active]:shadow-sm gap-2"
                    >
                      <BarChart3 className="w-4 h-4" />
                      التبرعات عبر الزمن
                    </TabsTrigger>
                  </TabsList>
                  <Select value={chartView} onValueChange={(v) => setChartView(v as ChartViewType)}>
                    <SelectTrigger className="h-8 w-[120px] px-2 text-xs rounded-lg border-slate-200 bg-white" aria-label="نوع الرسم">
                      <SelectValue placeholder="نوع الرسم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar" className="text-xs">أعمدة</SelectItem>
                      <SelectItem value="line" className="text-xs">خط</SelectItem>
                      <SelectItem value="area" className="text-xs">منطقة</SelectItem>
                    </SelectContent>
                  </Select>
                  {chartView === "bar" && chartMetric === "amount" && (
                    <button
                      type="button"
                      onClick={() => setShowFailed((p) => !p)}
                      className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                        showFailed
                          ? "bg-red-50 border-red-200 text-red-600"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      )}
                    >
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: showFailed ? "#ef4444" : "#94a3b8" }} />
                      {showFailed ? "إخفاء الفاشلة" : "إظهار الفاشلة"}
                    </button>
                  )}
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        <Card className="border-border shadow-sm">
          <CardHeader className="py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-row-reverse">
              <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2 justify-end">
                <Search className="w-4 h-4 shrink-0" />
                <span>تصفية النتائج</span>
              </CardTitle>
              <DonationsFilterActions
                canEditDonations={canEditDonations}
                canExportReports={canExportReports}
                onCreateDonation={() => donationActions.openCreate()}
                onExportReport={() => setExportOpen(true)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-4" dir="rtl">
            {/* Time span lives with the other filters rather than in a sticky bar of its own:
                one place to change what the page is showing, instead of two controls in two
                locations writing the same scope. */}
            <DashboardFilterBar
              // It renders its own card by default; nested inside this one it must drop that
              // chrome or the page shows a card inside a card.
              className="rounded-none border-0 bg-transparent p-0 shadow-none sm:p-0"
              periods={(Object.keys(PERIOD_LABELS) as ChartPeriod[]).map((p) => ({
                value: p,
                label: PERIOD_LABELS[p],
              }))}
              period={chartPeriod}
              onPeriodChange={(p) => {
                setChartPeriod(p);
                if (p === "custom") {
                  const endKey = istanbulTodayKey();
                  setDateTo(endKey);
                  setDateFrom(istanbulAddCalendarDaysKey(endKey, -30));
                } else {
                  setDateFrom("");
                  setDateTo("");
                }
              }}
              customValue={"custom" as ChartPeriod}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
              activeFilters={[
                selectedCategory !== "all" && {
                  id: "category",
                  label: "الحملة",
                  value: pickList(selectedCategory).map((id) => categories.find((c) => c.id === id)?.name ?? id).join("، "),
                  onClear: () => setSelectedCategory("all"),
                },
                selectedCampaign !== "all" && {
                  id: "campaign",
                  label: "المشروع",
                  value: pickList(selectedCampaign).map((id) => campaigns.find((c) => c.id === id)?.title ?? id).join("، "),
                  onClear: () => setSelectedCampaign("all"),
                },
                selectedUserId !== "all" && {
                  id: "donor",
                  label: "المتبرع",
                  value:
                    users.find((u) => u.id === selectedUserId)?.name ||
                    users.find((u) => u.id === selectedUserId)?.email ||
                    selectedUserId,
                  onClear: () => setSelectedUserId("all"),
                },
              ].filter(Boolean) as ActiveFilterChip[]}
              onClearAll={
                selectedCategory !== "all" || selectedCampaign !== "all" || selectedUserId !== "all"
                  ? () => {
                      setSelectedCategory("all");
                      setSelectedCampaign("all");
                      setSelectedUserId("all");
                    }
                  : undefined
              }
            />


<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

  {/* Saved views */}
  <div className="col-span-full flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 text-xs">
    <select value={activeViewId} onChange={(e) => { setActiveViewId(e.target.value); const v = savedViews.find((x) => x.id === e.target.value); if (v) applyView(v); }} className="h-8 rounded border border-slate-200 bg-white px-2" aria-label="العروض المحفوظة">
      <option value="">العروض المحفوظة…</option>
      {savedViews.map((v) => <option key={v.id} value={v.id}>{v.name}{v.shared ? " · مشترك" : ""}{!v.mine && v.ownerName ? ` (${v.ownerName})` : ""}</option>)}
    </select>
    <button type="button" onClick={() => void saveView()} className="h-8 rounded border border-slate-300 bg-white px-3 hover:bg-slate-100">💾 حفظ الفلاتر</button>
    {savedViews.find((x) => x.id === activeViewId)?.mine ? <button type="button" onClick={() => void deleteView()} className="h-8 rounded px-2 text-slate-500 hover:text-red-600">حذف العرض</button> : null}
  </div>


  {/* Category — several at once */}
  <MultiPick label="الفئة" allLabel="جميع الفئات" selected={pickList(selectedCategory)}
    options={categories.map((c) => ({ value: c.id, label: c.name }))}
    onChange={(next) => {
      setSelectedCategory(pickValue(next));
      // Drop chosen projects that are outside every chosen category.
      if (next.length) setSelectedCampaign((cur) => pickValue(pickList(cur).filter((id) => { const c = campaigns.find((item) => item.id === id); if (!c) return true; const ids = c.categoryIds ?? (c.categoryId ? [c.categoryId] : []); return next.some((cid) => ids.includes(cid)); })));
    }} />

  {/* Campaign — several at once; limited to the chosen categories */}
  <MultiPick label="المشروع" allLabel="جميع المشاريع" selected={pickList(selectedCampaign)} onChange={(next) => setSelectedCampaign(pickValue(next))}
    options={campaigns.filter((c) => { const cats = pickList(selectedCategory); const ids = c.categoryIds ?? (c.categoryId ? [c.categoryId] : []); return cats.length === 0 || cats.some((cid) => ids.includes(cid)); }).map((c) => ({ value: c.id, label: c.title }))} />

  {/* User — hidden when viewing a specific user via link (?userId=...) */}
  {!searchParams.get("userId") && (
    <div className="space-y-1 text-right">
      <label className="text-[11px] font-semibold text-slate-600">
        المستخدم
      </label>
      <Select
        value={selectedUserId}
        onValueChange={(v) => {
          setSelectedUserId(v);
          if (v === "all") {
            setUsersSearchInput("");
            setUsersSearchCommitted("");
            setUsers([]);
          }
        }}
      >
        <SelectTrigger className="w-full h-10 px-3 text-[13px] rounded-lg border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/15">
          <SelectValue placeholder="اختر المستخدم" />
        </SelectTrigger>
        <SelectContent>
          <div className="p-2 border-b border-slate-100 flex gap-1.5 flex-row-reverse items-center">
            <Input
              placeholder="بحث… ثم Enter أو زر البحث"
              value={usersSearchInput}
              onChange={(e) => setUsersSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitUsersSearch();
                }
              }}
              className="w-full h-8 text-xs flex-1 min-w-0"
            />
            <button
              type="button"
              title="بحث"
              disabled={usersSearchLoading}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                commitUsersSearch();
              }}
              className="shrink-0 h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-50"
            >
              {usersSearchLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
              ) : (
                <Search className="w-3.5 h-3.5 text-slate-600" />
              )}
            </button>
          </div>
          <SelectItem value="all" className="text-xs">الكل</SelectItem>
          {users.map((u) => (
            <SelectItem key={u.id} value={u.id} className="text-xs">
              {u.name || u.email}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )}

  {/* Chart Metric */}
  <div className="space-y-1 text-right">
    <label className="text-[11px] font-semibold text-slate-600">
      القيمة
    </label>
    <Select value={chartMetric} onValueChange={(v) => setChartMetric(v as ChartMetric)}>
      <SelectTrigger className="w-full h-10 px-3 text-[13px] rounded-lg border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/15">
        <SelectValue placeholder="اختر القيمة" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="amount" className="text-xs">المبلغ</SelectItem>
        <SelectItem value="teamSupport" className="text-xs">دعم الفريق</SelectItem>
        <SelectItem value="fees" className="text-xs">الرسوم</SelectItem>
      </SelectContent>
    </Select>
  </div>

  {/* Donation source (classified attribution) — several at once */}
  <MultiPick label="مصدر التبرع" allLabel="كل المصادر" selected={pickList(donationSourceFilter)} onChange={(next) => setDonationSourceFilter(pickValue(next))}
    options={[["facebook", "فيسبوك"], ["instagram", "إنستغرام"], ["whatsapp", "واتساب"], ["email", "البريد الإلكتروني"], ["google_ads", "إعلانات Google"], ["google_search", "بحث Google"], ["tiktok", "تيك توك"], ["direct", "مباشر"], ["other", "أخرى"], ["unknown", "غير معروف"]].map(([value, label]) => ({ value, label }))} />

  {/* Site language (donation row locale) — several at once */}
  <MultiPick label="لغة الموقع (التبرع)" allLabel="كل اللغات" selected={pickList(donationLocaleFilter)} onChange={(next) => setDonationLocaleFilter(pickValue(next))}
    options={[["ar", "العربية"], ["en", "English"], ["fr", "Français"], ["tr", "Türkçe"], ["id", "Indonesia"], ["pt", "Português"], ["es", "Español"], ["de", "Deutsch"], ["__unset", "غير محدد"]].map(([value, label]) => ({ value, label }))} />

  {/* Donor country — several at once */}
  <MultiPick label="الدولة" allLabel="كل الدول" selected={pickList(donationCountryFilter)} onChange={(next) => setDonationCountryFilter(pickValue(next))}
    options={[
      ...countryOptions.map((c) => ({ value: c.code, label: getCountryDisplayNameFromCode(c.code, locale || "ar"), count: c.count })),
      ...(countryUnsetCount > 0 ? [{ value: "__unset", label: "غير محدد", count: countryUnsetCount }] : []),
    ]} />

  {/* Donation Status Filter */}
  <div className="space-y-1 text-right">
    <label className="text-[11px] font-semibold text-slate-600">
      حالة التبرع
    </label>
    <Select value={donationsStatusFilter} onValueChange={(v) => setDonationsStatusFilter(v as typeof donationsStatusFilter)}>
      <SelectTrigger className="w-full h-10 px-3 text-[13px] rounded-lg border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 focus:border-brand focus:ring-2 focus:ring-brand/15">
        <SelectValue placeholder="الحالة" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">كل الحالات</SelectItem>
        <SelectItem value="PAID" className="text-xs">ناجح</SelectItem>
        <SelectItem value="FAILED" className="text-xs">فاشل</SelectItem>
      </SelectContent>
    </Select>
  </div>

</div>

</CardContent>



        </Card>

        {/* التبرعات */}
        <section className="space-y-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
            التبرعات
          </h2>
          <Card className="border-border shadow-sm">
            <CardHeader className="border-b border-slate-100 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 flex-row-reverse">
                <div className="text-right space-y-1">
                  <CardTitle className="text-base font-semibold text-slate-900">
                    أحدث التبرعات
                  </CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center shrink-0">
                <DonorSearchInput
                  value={donationsSearch}
                  onCommit={setDonationsSearch}
                  loading={donationsLoading}
                />
                <Select
                  value={`${donationsSortBy}-${donationsSortOrder}`}
                  onValueChange={(v) => {
                    const [by, order] = v.split("-") as ["date" | "amount", "asc" | "desc"];
                    setDonationsSortBy(by);
                    setDonationsSortOrder(order);
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[200px] h-9 border-slate-200 bg-slate-50/50" dir="rtl">
                    <SelectValue placeholder="ترتيب" />
                  </SelectTrigger>
                  <SelectContent dir="rtl">
                    <SelectItem value="date-desc">الأحدث أولاً</SelectItem>
                    <SelectItem value="date-asc">الأقدم أولاً</SelectItem>
                    <SelectItem value="amount-desc">الأعلى مبلغاً</SelectItem>
                    <SelectItem value="amount-asc">الأقل مبلغاً</SelectItem>
                  </SelectContent>
                </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto" dir="rtl">
                <table className="w-full text-xs text-right leading-snug">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        المتبرع
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 min-w-[100px] max-w-[130px]">
                        الدولة
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        التبرع
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        الحالة
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        البوابة
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        دعم الفريق
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        الإحالة
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        مصدر التبرع
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 max-w-[110px]">
                        المشروع / الفئة
                      </th>
                      <th className="text-right py-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">
                        التاريخ
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {donationsLoading && donations.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center">
                          <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400" />
                        </td>
                      </tr>
                    ) : !donationsFetchedOnce ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500">
                          جاري التحميل...
                        </td>
                      </tr>
                    ) : donations.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-slate-500">
                          لا توجد تبرعات تطابق التصفية
                        </td>
                      </tr>
                    ) : (
                      donations.map((d) => (
                        <tr
                          key={d.id}
                          onContextMenu={(e) => donationActions.onContextMenu(e, d)}
                          className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() => d.donor?.id && openUserProfile(d.donor.id)}
                              className="text-right w-full max-w-[200px] rounded-md -mx-0.5 px-0.5 py-0 hover:bg-slate-100/80 transition-colors cursor-pointer border-0 bg-transparent"
                            >
                              <p className="font-medium text-slate-900">
                                {d.donor?.name || "—"}
                              </p>
                              {d.donor?.email && (
                                <p className="text-[10px] text-slate-500 truncate max-w-[160px]">
                                  {d.donor.email}
                                </p>
                              )}
                            </button>
                          </td>
                          <td className="py-2.5 px-3 align-middle max-w-[130px]">
                            <DonationTableCountryColumn countryCode={d.donorCountryCode} />
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800" dir="rtl">
                            <span dir="ltr">
                              {formatMoney(donationDisplayTotalLocal(d), d.currency, d.amountUSD ?? undefined)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {d.status === "FAILED" ? (
                              <button
                                type="button"
                                onClick={() => openDonationDetails("error", d)}
                                className="inline-block px-1.5 py-px rounded-full text-[11px] font-medium bg-red-100 text-red-700 hover:bg-red-200 transition-colors cursor-pointer"
                                title="عرض رسالة الخطأ من بوابة الدفع"
                              >
                                فاشل
                              </button>
                            ) : (
                              <span
                                className={cn(
                                  "inline-block px-1.5 py-px rounded-full text-[11px] font-medium w-max",
                                  d.status === "PAID" && d.paidAt
                                    ? "bg-green-100 text-green-700"
                                    : "bg-amber-100 text-amber-700"
                                )}
                                title={d.status === "PAID" && !d.paidAt ? "تم بدء الدفع ولم يؤكده مزود الدفع بعد — لا يُحتسب في الإيرادات" : undefined}
                              >
                                {d.status === "PAID"
                                  ? d.paidAt
                                    ? "ناجح"
                                    : "قيد التأكيد"
                                  : "معلق"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            {d.provider === "PAYFOR" ? (
                              <button
                                type="button"
                                onClick={() => openDonationDetails("payment", d)}
                                className="inline-flex items-center rounded hover:opacity-80 hover:scale-[1.03] active:scale-95 transition-all"
                                title="عرض تفاصيل بوابة الدفع"
                              >
                                <span className="inline-flex items-center">
                                  <img
                                    src="/ziraat.jpg"
                                    alt="PayFor"
                                    className="h-8 w-auto max-w-[72px] object-contain rounded"
                                  />
                                </span>
                              </button>
                            ) : d.provider === "BANK_TRANSFER" ? (
                              <span
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold bg-brand/10 text-brand"
                                title="تبرع عبر تحويل بنكي — مستورد من كشف الحساب"
                              >
                                <Landmark className="w-3 h-3" />
                                تحويل بنكي
                              </span>
                            ) : d.provider ? (
                              // Any other stored gateway (incl. historical rows) — shown as recorded.
                              <span className="text-slate-500 text-xs">{d.provider}</span>
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-800" dir="rtl">
                            {(d.teamSupport ?? 0) > 0 ? (
                              <span dir="ltr">
                                {formatMoney(d.teamSupport ?? 0, d.currency, (d.totalAmount && (d.amountUSD != null)) ? ((d.teamSupport ?? 0) / d.totalAmount) * d.amountUSD : undefined)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 align-middle">
                            {d.referral ? (
                              <Link
                                href={`/dashboard/referrals/${d.referral.id}`}
                                className="text-xs font-medium text-brand hover:text-brand hover:underline"
                              >
                                {d.referral.code}
                              </Link>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 align-middle">
                            <button
                              type="button"
                              onClick={() => openDonationDetails("attribution", d)}
                              className="inline-flex max-w-full text-right rounded-md hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-0 p-0"
                              title="عرض تفاصيل الإسناد الإعلاني"
                            >
                              <DonationSourceBadge
                                attribution={d.attribution}
                                conversionEventsSentAt={d.conversionEventsSentAt}
                                conversionFailedEventsSentAt={d.conversionFailedEventsSentAt}
                                status={d.status}
                              />
                            </button>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 max-w-[110px]">
                            {d.campaigns?.length > 0 ? (
                              (() => {
                                const first = d.campaigns[0];
                                const more = d.campaigns.length - 1;
                                const fullList = d.campaigns.map((c) => c.title).join(", ");
                                return (
                                  <div className="flex items-center gap-1 max-w-[110px]">
                                    <Link
                                      href={`/${locale}/campaign/${first.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={fullList}
                                      className="truncate text-slate-700 hover:text-brand hover:underline"
                                    >
                                      {first.title}
                                    </Link>
                                    {more > 0 && (
                                      <span className="shrink-0 text-[10px] text-slate-400" title={fullList}>
                                        +{more}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()
                            ) : d.categories?.length > 0 ? (
                              (() => {
                                const first = d.categories[0];
                                const more = d.categories.length - 1;
                                const fullList = "فئة: " + d.categories.map((c) => c.name).join(", ");
                                return (
                                  <div className="flex items-center gap-1 max-w-[110px]">
                                    <Link
                                      href={`/${locale}/category/${first.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title={fullList}
                                      className="truncate text-slate-700 hover:text-brand hover:underline"
                                    >
                                      فئة: {first.name}
                                    </Link>
                                    {more > 0 && (
                                      <span className="shrink-0 text-[10px] text-slate-400" title={fullList}>
                                        +{more}
                                      </span>
                                    )}
                                  </div>
                                );
                              })()
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            <div className="flex flex-col leading-tight">
                              <span>
                                {new Date(d.createdAt).toLocaleDateString("en-US", {
                                  dateStyle: "medium",
                                  timeZone: "Europe/Istanbul",
                                })}
                              </span>
                              <span className="text-[10px] text-slate-400" dir="ltr">
                                {new Date(d.createdAt).toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                  timeZone: "Europe/Istanbul",
                                })}
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {hasMoreDonations && (
                <div className="p-4 border-t border-slate-100 text-center">
                  <button
                    type="button"
                    onClick={loadMoreDonations}
                    disabled={donationsLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50"
                  >
                    {donationsLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4 rotate-180" />
                    )}
                    عرض المزيد
                  </button>
                </div>
              )}
              {donationsTotal > 0 && (
                <p className="text-xs text-slate-500 px-4 py-2 border-t border-slate-100 text-right">
                  عرض {donations.length} من {donationsTotal} تبرع
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
      <DonationDetailsDialog
        open={donationDetails.open}
        onOpenChange={(o) => setDonationDetails((s) => ({ ...s, open: o }))}
        mode={donationDetails.mode}
        donation={donationDetails.donation}
      />
      {donationActions.portals}
      <ExportReportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        endpoint="/api/admin/donations/export"
        title="تصدير تقرير التبرعات"
        description="اضبط المعايير قبل التصدير. سيشمل التقرير قائمة كاملة بكل العمليات بالإضافة إلى ملخص شامل."
        defaults={exportDefaults}
        options={{
          categories: exportCategoryOptions,
          campaigns: exportCampaignOptions,
          countries: exportCountryOptions,
          locales: exportLocaleOptions,
        }}
        enabledFields={{
          period: true,
          dateRange: true,
          category: true,
          campaign: true,
          status: true,
          locale: true,
          country: true,
          sort: true,
          limit: true,
        }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 max-w-[1600px] mx-auto" dir="rtl">
      <div className="h-16 rounded-lg bg-slate-200 animate-pulse" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-slate-200 animate-pulse" />
        ))}
      </div>
      <div className="h-[480px] rounded-lg bg-slate-200 animate-pulse" />
      <div className="h-64 rounded-lg bg-slate-200 animate-pulse" />
    </div>
  );
}
