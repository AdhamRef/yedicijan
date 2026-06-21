"use client";

import React, { useState } from "react";
import {
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Send,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import {
  MESSAGE_SUBJECTS,
  type MessageSubject,
  subjectLabel,
} from "@/lib/messages/subjects";
import { getSocialLinks } from "@/lib/social-links";
import { track } from "@vercel/analytics";

const PHONE_RAW = "+902122885930";
const PHONE_DISPLAY = "+90 212 288 59 30";
const EMAIL = "info@gozbebekleri.org.tr";
const ADDRESS_LINES = [
  "ŞİRİNEVLER MAH. KAZIM KARABEKİR",
  "3. SOKAK DISKAPINO:14",
  "ZAKKUM AP İÇKAPINO:2",
  "BAHÇELİEVLER / İSTANBUL",
];

const ContactPage = () => {
  const t = useTranslations("ContactUs");
  const locale = useLocale() as "ar" | "en" | "fr" | "tr";

  const messageTypes: MessageSubject[] = MESSAGE_SUBJECTS.filter(
    (s) => s !== "COMPLAINT",
  );

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    messageType: "DONATION_ISSUE" as MessageSubject,
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async () => {
    if (
      !formData.name ||
      !formData.phone ||
      !formData.email ||
      !formData.message
    ) {
      alert(t("requiredFields"));
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: formData.messageType,
          body: `${formData.message}${formData.phone ? `\n\nPhone: ${formData.phone}` : ""}`,
          locale,
          guestName: formData.name,
          guestEmail: formData.email,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setIsSuccess(true);
      try { track("contact_message_sent", { source: "contact_page", subject: formData.messageType, locale }); } catch {}
    } catch {
      try { track("contact_message_failed", { source: "contact_page", subject: formData.messageType, locale }); } catch {}
      alert(t("errorOccurred"));
    } finally {
      setIsSubmitting(false);
    }
    setTimeout(() => {
      setFormData({
        name: "",
        phone: "",
        email: "",
        messageType: "DONATION_ISSUE",
        message: "",
      });
      setIsSuccess(false);
    }, 4000);
  };

  const contactItems = [
    {
      Icon: MapPin,
      title: t("address"),
      content: (
        <address className="not-italic" dir="ltr">
          {ADDRESS_LINES.map((line) => (
            <p key={line} className="text-gray-500 text-xs leading-relaxed">
              {line}
            </p>
          ))}
        </address>
      ),
    },
    {
      Icon: Phone,
      title: t("phone"),
      content: (
        <a
          href={`tel:${PHONE_RAW}`}
          dir="ltr"
          className="text-[#A5243D] text-xs font-medium hover:underline"
        >
          {PHONE_DISPLAY}
        </a>
      ),
    },
    {
      Icon: Mail,
      title: t("email"),
      content: (
        <a
          href={`mailto:${EMAIL}`}
          dir="ltr"
          className="text-[#A5243D] text-xs font-medium hover:underline break-all"
        >
          {EMAIL}
        </a>
      ),
    },
    {
      Icon: MessageCircle,
      title: t("whatsapp"),
      content: (
        <a
          href={`https://wa.me/${PHONE_RAW.replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
          className="text-[#A5243D] text-xs font-medium hover:underline"
        >
          {PHONE_DISPLAY}
        </a>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-white">
      {/* ── Header ── */}
      <section className="hero-pattern text-white py-14 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="gold-mark mx-auto mb-5" />
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">
            {t("pageTitle")}
          </h1>
          <p className="text-ice text-sm max-w-md mx-auto">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* ── Info Cards ── */}
      <section className="max-w-7xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-10">
          {contactItems.map(({ Icon, title, content }) => (
            <div
              key={title}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 rounded-full bg-[#A5243D]/10 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-[#A5243D]" />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">{title}</h3>
              {content}
            </div>
          ))}
        </div>

        {/* ── Form + Map ── */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Contact Form */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {t("contactForm")}
            </h2>
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center py-10 gap-4">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
                <p className="text-lg font-semibold text-gray-800">
                  {t("successMessage")}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      {t("name")} *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#A5243D] focus:ring-2 focus:ring-[#A5243D]/10 transition-all"
                      placeholder={t("namePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      {t("phone")} *
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#A5243D] focus:ring-2 focus:ring-[#A5243D]/10 transition-all"
                      placeholder="+90 XXX XXX XX XX"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    {t("email")} *
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#A5243D] focus:ring-2 focus:ring-[#A5243D]/10 transition-all"
                    placeholder="example@email.com"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    {t("messageType")}
                  </label>
                  <select
                    value={formData.messageType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        messageType: e.target.value as MessageSubject,
                      })
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#A5243D] focus:ring-2 focus:ring-[#A5243D]/10 transition-all bg-white"
                  >
                    {messageTypes.map((type) => (
                      <option key={type} value={type}>
                        {subjectLabel(type, locale)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    {t("message")} *
                  </label>
                  <textarea
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    rows={4}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#A5243D] focus:ring-2 focus:ring-[#A5243D]/10 transition-all resize-none"
                    placeholder={t("messagePlaceholder")}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-[#A5243D] hover:bg-[#7D1830] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmitting ? t("sending") : t("submit")}
                </button>
              </div>
            )}
          </div>

          {/* Map */}
          <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm min-h-[400px]">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3008.4694395755955!2d28.97862!3d41.03265!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14cab9e4a1a8e0e5%3A0x0!2sBeyoglu%2C%20Istanbul!5e0!3m2!1sen!2str!4v1000000000000"
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: "400px" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>

        {/* Social Media */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-gray-600">
            {t("followUs")}
          </p>
          <div className="flex items-center gap-3">
            {(() => {
              const social = getSocialLinks(locale);
              return [
                { Icon: Facebook, href: social.facebook, label: "Facebook" },
                { Icon: Instagram, href: social.instagram, label: "Instagram" },
                { Icon: Twitter, href: social.twitter, label: "Twitter" },
                { Icon: Youtube, href: social.youtube, label: "YouTube" },
              ];
            })().map(({ Icon, href, label }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-[#A5243D] hover:bg-[#A5243D] text-white flex items-center justify-center transition-colors"
              >
                <Icon className="w-5 h-5" />
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default ContactPage;
