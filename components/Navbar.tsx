"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  Search,
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Heart,
  Facebook,
  Instagram,
  Twitter,
  MessageCircle,
  Phone,
  UserCircle,
  Landmark,
  Calculator,
  Infinity as InfinityIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { useSession, signOut } from "next-auth/react";
import CartSheet from "../components/CartSheet";
import { useCart } from "@/hooks/useCart";
import { CART_OPEN_EVENT, CART_CHANGED_EVENT } from "@/components/CartReminder";
import CurrencySelector from "./CurrencySelector";
import LanguageSwitcher from "./LanguageSelector";
import SignInDialog from "@/components/SignInDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dynamic from "next/dynamic";
const CartPaymentDialog = dynamic(() => import("./CartPaymentDialog"), { ssr: false });
// framer-motion removed — replaced with CSS-only fade animations to keep ~70 KiB
// of motion JS off the homepage critical path.
import { appendCurrencyQuery, getCurrencyCodeForLinks } from "@/lib/currency-link";
import { CURRENCY_COOKIE_UPDATED_EVENT } from "@/components/CurrencyFromUrlSync";
import { getSocialLinks } from "@/lib/social-links";

interface CartItem {
  id: string;
  campaignId: string;
  amount: number;
  amountUSD: number;
  currency: string;
  userId: string;
  createdAt: string;
  campaign: {
    id: string;
    title: string;
    images: string[];
  };
}

const LOGO_URL = "/yedicijan_logo.png";
const LOGO_MOBILE_URL = "/yedicijan_logo.png";

const Navbar = () => {
  const t = useTranslations("Navbar");
  const tZakat = useTranslations("Zakat");
  const tWaqf = useTranslations("Waqf");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const social = getSocialLinks(locale);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSignInOpen, setIsSignInOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCartPaymentDialogOpen, setIsCartPaymentDialogOpen] = useState(false);
  const [signInCallbackUrl, setSignInCallbackUrl] = useState<string | undefined>(undefined);
  const [cartGuestMode, setCartGuestMode] = useState(false);
  const { items: zustandItems, removeItem: zustandRemoveItem, clearItems: clearZustandItems } = useCart();
  const userMenuRef = useRef<HTMLDivElement>(null);
  // Force a re-render when the currency cookie changes so SSR'd `?currency=USD`
  // links refresh once middleware / CurrencyFromUrlSync settles the real choice.
  const [, setCurrencyTick] = useState(0);
  useEffect(() => {
    setCurrencyTick((n) => n + 1); // hydration: re-read after middleware-set cookie
    const onUpdate = () => setCurrencyTick((n) => n + 1);
    window.addEventListener(CURRENCY_COOKIE_UPDATED_EVENT, onUpdate);
    return () => window.removeEventListener(CURRENCY_COOKIE_UPDATED_EVENT, onUpdate);
  }, []);

  useEffect(() => {
    if (searchParams.get("openCartPayment") === "1") {
      setCartGuestMode(!session?.user && zustandItems.length > 0);
      setIsCartPaymentDialogOpen(true);
      router.replace(appendCurrencyQuery(pathname, getCurrencyCodeForLinks()));
    }
  }, [searchParams, pathname, router, session?.user, zustandItems.length]);

  useEffect(() => {
    const fetchCartItems = async () => {
      if (session?.user && status === "authenticated") {
        try {
          const response = await axios.get("/api/cart");
          setCartItems(response.data);
        } catch {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    };
    fetchCartItems();
  }, [session, status]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRemoveItem = async (id: string) => {
    if (!session?.user) {
      zustandRemoveItem(id);
      window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
      return;
    }
    try {
      await axios.delete(`/api/cart/${id}`);
      setCartItems((prev) => prev.filter((item) => item.id !== id));
      window.dispatchEvent(new CustomEvent(CART_CHANGED_EVENT));
    } catch {}
  };

  const onOpenDonationDialog = () => {
    setIsCartOpen(false);
    setIsCartPaymentDialogOpen(true);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(
        appendCurrencyQuery(
          `/campaigns?search=${encodeURIComponent(searchQuery.trim())}`,
          getCurrencyCodeForLinks()
        )
      );
      setSearchQuery("");
      setIsMobileMenuOpen(false);
    }
  };

  const openCart = () => {
    if (session?.user) {
      setCartGuestMode(false);
      setIsCartOpen(true);
    } else if (zustandItems.length > 0) {
      setCartGuestMode(true);
      setIsCartOpen(true);
    } else {
      setSignInCallbackUrl(
        typeof window !== "undefined"
          ? appendCurrencyQuery(pathname, getCurrencyCodeForLinks())
          : undefined
      );
      setIsSignInOpen(true);
    }
  };

  // Floating CartReminder asks Navbar to open the cart sheet via this event.
  useEffect(() => {
    const onOpen = () => openCart();
    window.addEventListener(CART_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CART_OPEN_EVENT, onOpen);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, zustandItems.length, pathname]);

  // Zakat and waqf sit beside the projects with an icon; the bank accounts link lives in the
  // top bar on desktop (and stays in the mobile menu), so the main row keeps six links.
  const navLinks: { href: string; label: string; Icon?: LucideIcon; desktop?: boolean }[] = [
    { href: "/about-us", label: t("about") },
    { href: "/campaigns", label: t("projects") },
    { href: "/zakat", label: tZakat("navLabel"), Icon: Calculator },
    { href: "/waqf", label: tWaqf("navLabel"), Icon: InfinityIcon },
    { href: "/blog", label: t("news") },
    { href: "/bank-transfer", label: t("bankAccounts"), desktop: false },
    { href: "/contact-us", label: t("contact") },
  ];

  const checkoutCartItems =
    isCartPaymentDialogOpen && cartGuestMode
      ? zustandItems
      : session?.user
      ? cartItems
      : zustandItems;

  const cartPaymentCallbackUrl =
    typeof window !== "undefined"
      ? appendCurrencyQuery(`${pathname}?openCartPayment=1`, getCurrencyCodeForLinks())
      : undefined;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        {/* ── Phones: a slim bar above the header with the two giving pages ── */}
        <div className="grid h-9 grid-cols-2 bg-deep text-[13px] font-extrabold text-white lg:hidden">
          {navLinks.filter((link) => link.Icon).map((link, i) => {
            const Icon = link.Icon as LucideIcon;
            const active = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 transition-colors ${i > 0 ? "border-s border-white/15" : ""} ${active ? "bg-white/10 text-gold" : "hover:text-gold"}`}>
                <Icon className="h-4 w-4 text-gold" />{link.label}
              </Link>
            );
          })}
        </div>
        {/* ── Top Utility Bar (desktop only) — slim ── */}
        <div className="bg-deep text-ice text-[13px] hidden lg:block">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-10">
            {/* Left: social icons + phone */}
            <div className="flex items-center gap-0.5">
              {[
                { Icon: Instagram, href: social.instagram, label: "Instagram" },
                { Icon: Facebook, href: social.facebook, label: "Facebook" },
                { Icon: Twitter, href: social.twitter, label: "Twitter" },
              ].map(({ Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="p-1.5 rounded-md hover:text-gold transition-colors"
                >
                  <Icon className="w-3.5 h-3.5" />
                </a>
              ))}
              <a
                href="https://wa.me/905306516549"
                className="ms-2 ps-3 border-s border-white/15 flex items-center gap-1.5 hover:text-gold transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span dir="ltr">+90 530 651 65 49</span>
              </a>
              <Link
                href="/bank-transfer"
                className="ms-3 ps-3 border-s border-white/15 flex items-center gap-1.5 hover:text-gold transition-colors"
              >
                <Landmark className="w-3.5 h-3.5" />
                {t("bankAccounts")}
              </Link>
            </div>
            {/* Right: language + currency */}
            <div className="flex items-center gap-3">
              <LanguageSwitcher onDark={true} />
              <div className="border-s border-white/15 ps-3">
                <CurrencySelector onDark={true} />
              </div>
            </div>
          </div>
        </div>

        {/* ── Main Navbar — compact light ── */}
        <nav
          className={`bg-offwhite/95 backdrop-blur-md border-b border-line transition-shadow duration-300 ${
            isScrolled ? "shadow-[0_10px_30px_-20px_rgba(18,35,57,.45)]" : ""
          }`}
        >
          <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center h-16 lg:h-[76px] gap-2 lg:gap-3 xl:gap-6">

            {/* Logo — always visible */}
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              {/* Mobile: narrow square logo */}
              <Image src={LOGO_MOBILE_URL} alt="YediCihan 1961" width={716} height={270} priority className="lg:hidden h-8 w-auto object-contain" />
              {/* Desktop: wide logo — width must match aspect ratio to prevent blur */}
              <Image src={LOGO_URL} alt="YediCihan 1961" width={716} height={270} priority className="hidden lg:block h-11 w-auto object-contain" />
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-0 xl:gap-1 flex-1 min-w-0">
              {navLinks.filter((link) => link.desktop !== false).map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href + link.label}
                    href={link.href}
                    className={`group relative inline-flex items-center gap-1.5 whitespace-nowrap px-2 xl:px-3 py-2 text-[14px] xl:text-[15px] font-bold transition-colors ${
                      active ? "text-deep" : "text-deep/70 hover:text-deep"
                    }`}
                  >
                    {link.Icon && <link.Icon className={`hidden h-4 w-4 xl:block ${active ? "text-burgundy" : "text-gold group-hover:text-burgundy"}`} strokeWidth={2.2} />}
                    {link.label}
                    <span
                      className={`pointer-events-none absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-gold transition-all duration-300 origin-center ${
                        active
                          ? "opacity-100 scale-x-100"
                          : "opacity-0 scale-x-0 group-hover:opacity-70 group-hover:scale-x-100"
                      }`}
                    />
                  </Link>
                );
              })}
            </div>

            {/* Desktop: Donate button */}
            <Link
              href="/campaigns"
              className="hidden lg:flex items-center gap-2 rounded-full bg-burgundy hover:bg-burgundyDark text-white font-bold text-[15px] whitespace-nowrap px-4 xl:px-6 h-12 shadow-[0_14px_30px_-14px_rgba(166,36,60,.7)] transition-colors flex-shrink-0"
            >
              <Heart className="w-4 h-4" />
              {t("donate") || "BAĞIŞ YAP"}
            </Link>

            {/* Spacer — pushes right-side items to the edge on mobile */}
            <div className="flex-1 lg:hidden" />

            {/* Mobile: compact donate pill — language and currency live in the menu
                so the bar keeps logo + three clear actions. */}
            <Link
              href="/campaigns"
              className="lg:hidden inline-flex h-10 items-center gap-1.5 rounded-full bg-burgundy px-4 text-[13px] font-bold text-white flex-shrink-0"
            >
              <Heart className="w-3.5 h-3.5" />
              {t("donate") || "BAĞIŞ YAP"}
            </Link>

            {/* Cart button — always visible */}
            <button
              type="button"
              onClick={openCart}
              className="relative grid h-10 w-10 lg:h-11 lg:w-11 place-items-center rounded-full border border-line bg-white text-deep hover:border-burgundy/40 hover:text-burgundy transition-colors flex-shrink-0"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {(session?.user ? cartItems.length : zustandItems.length) > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-burgundy text-white text-[10px] font-extrabold rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white">
                  {session?.user ? cartItems.length : zustandItems.length}
                </span>
              )}
            </button>

            {/* User avatar / Sign in */}
            {status === "authenticated" && session?.user ? (
              <div className={`relative flex-shrink-0 ${isRTL ? "mr-1.5" : "ml-1.5"}`} ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-1 rounded-full p-0.5 ring-1 ring-gray-200 hover:ring-burgundy/40 transition-all"
                >
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={session.user.image ?? ""} />
                    <AvatarFallback className="bg-burgundy text-white text-xs">
                      {session.user.name?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden lg:block me-1" />
                </button>
                {isUserMenuOpen && (
                  <div
                    className={`absolute mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-1 z-50 animate-fade-in overflow-hidden ${isRTL ? "left-0" : "right-0"}`}
                  >
                      <div className="px-4 py-3 border-b border-gray-100 bg-offwhite/50">
                        <p className="text-sm font-semibold text-deep truncate">{session.user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                      </div>
                           {(session.user.role === "ADMIN" || session.user.role === "STAFF") && (
                        <a
                          href="/dashboard"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-burgundy" />
                          {isRTL ? "لوحة التحكم" : "Dashboard"}
                        </a>
                      )}
                      <Link
                        href="/profile"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <UserCircle className="w-4 h-4 text-burgundy" />
                        {t("profile") || "Profilim"}
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setIsUserMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                      >
                        <LogOut className="w-4 h-4" />
                        {t("signOut") || "Çıkış"}
                      </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSignInCallbackUrl(
        typeof window !== "undefined"
          ? appendCurrencyQuery(pathname, getCurrencyCodeForLinks())
          : undefined
      );
                  setIsSignInOpen(true);
                }}
                className="hidden lg:flex items-center gap-1.5 h-11 text-[14px] font-bold text-deep hover:text-burgundy border border-line bg-white hover:border-burgundy/40 rounded-full whitespace-nowrap px-4 xl:px-5 transition-colors flex-shrink-0"
              >
                {t("signIn") || "Giriş Yap"}
              </button>
            )}

            {/* Mobile: Hamburger */}
            <button
              type="button"
              className="lg:hidden grid h-10 w-10 place-items-center rounded-full border border-line bg-white text-deep flex-shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* ── Mobile Menu ── */}
          {isMobileMenuOpen && (
            <div className="lg:hidden max-h-[calc(100dvh-100px)] overflow-y-auto border-t border-line bg-white animate-fade-in">
                {/* Language + currency */}
                <div className="flex items-center justify-between gap-3 border-b border-line bg-offwhite px-5 py-3">
                  <LanguageSwitcher onDark={false} />
                  <CurrencySelector onDark={false} />
                </div>
                {/* Zakat and waqf first, as two tiles */}
                <div className="grid grid-cols-2 gap-2 border-b border-line px-4 py-3">
                  {navLinks.filter((link) => link.Icon).map((link) => {
                    const active = pathname === link.href;
                    const Icon = link.Icon as LucideIcon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-2xl px-3 py-3 text-[14px] font-extrabold transition-colors ${active ? "bg-burgundy text-white" : "bg-deep text-white hover:bg-deep/90"}`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${active ? "bg-white/15" : "bg-white/10"}`}><Icon className="h-5 w-5 text-gold" /></span>
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
                {/* Nav links */}
                {navLinks.filter((link) => !link.Icon).map((link) => {
                  const active = pathname === link.href;
                  return (
                    <Link
                      key={link.href + link.label}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-5 py-3.5 text-[15px] font-bold border-b border-line transition-colors ${
                        active
                          ? "text-deep bg-offwhite"
                          : "text-deep/80 hover:bg-offwhite"
                      }`}
                    >
                      <span className={`h-5 w-1 rounded-full transition-colors ${active ? "bg-gold" : "bg-transparent"}`} />
                      {link.label}
                    </Link>
                  );
                })}

                {/* User info (mobile) */}
                {status === "authenticated" && session?.user && (
                  <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={session.user.image ?? ""} />
                      <AvatarFallback className="bg-burgundy text-white text-xs">
                        {session.user.name?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-deep truncate">{session.user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href="/profile"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 shape-chip bg-offwhite text-burgundy hover:bg-gold/20 transition-colors"
                      >
                        <LayoutDashboard className="w-4 h-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => { setIsMobileMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                        className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Donate + Sign in */}
                <div className="px-5 py-3 flex gap-3 border-b border-gray-100">
                  <Link
                    href="/campaigns"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-burgundy hover:bg-burgundyDark text-white font-bold text-[15px] px-4 h-12 transition-colors"
                  >
                    <Heart className="w-4 h-4" />
                    {t("donate") || "BAĞIŞ YAP"}
                  </Link>
                  {!session?.user && (
                    <button
                      type="button"
                      onClick={() => { setIsMobileMenuOpen(false); setIsSignInOpen(true); }}
                      className="flex-1 flex items-center justify-center text-[15px] font-bold text-deep border border-line bg-white rounded-full px-4 h-12 hover:bg-offwhite transition-colors"
                    >
                      {t("signIn") || "Giriş Yap"}
                    </button>
                  )}
                </div>

                {/* Social links */}
                <div className="px-5 py-3 flex items-center justify-center gap-3">
                  {[
                    { Icon: Instagram, href: social.instagram, label: "Instagram" },
                    { Icon: Facebook, href: social.facebook, label: "Facebook" },
                    { Icon: Twitter, href: social.twitter, label: "Twitter" },
                    { Icon: MessageCircle, href: "https://wa.me/905306516549", label: "WhatsApp" },
                  ].map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-burgundy hover:text-white flex items-center justify-center transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
            </div>
          )}
        </nav>
      </header>

      {/* Cart Sheet */}
      <CartSheet
        open={isCartOpen}
        onOpenChange={setIsCartOpen}
        cartItems={session?.user ? cartItems : zustandItems}
        handleRemoveItem={handleRemoveItem}
        onOpenDonationDialog={onOpenDonationDialog}
      />

      {/* Cart Payment Dialog */}
      <CartPaymentDialog
        isOpen={isCartPaymentDialogOpen}
        onClose={() => setIsCartPaymentDialogOpen(false)}
        cartItems={checkoutCartItems}
        guestMode={false}
        authCallbackUrl={cartPaymentCallbackUrl}
        onSuccess={() => {
          setIsCartPaymentDialogOpen(false);
          setCartItems([]);
          if (cartGuestMode) clearZustandItems();
        }}
      />

      {/* Sign In Dialog */}
      <SignInDialog
        isOpen={isSignInOpen}
        onClose={() => setIsSignInOpen(false)}
        callbackUrl={signInCallbackUrl}
      />
    </>
  );
};

export default Navbar;
