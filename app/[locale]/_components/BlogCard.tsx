"use client";

import { Link } from "@/i18n/routing";
import React from "react";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface BlogCardProps {
  title: string;
  image: string;
  link?: string;
  description?: string;
}

const BlogCard: React.FC<BlogCardProps> = ({ title, image, link = "#", description }) => {
  const t = useTranslations("BlogCard");
  return (
    <Link href={link} className="group flex h-full flex-col overflow-hidden rounded-[28px] border border-line bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_60px_-30px_rgba(18,35,57,.35)]">
      {/* Image */}
      <div className="relative overflow-hidden aspect-[16/10] flex-shrink-0 bg-sand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-extrabold text-deep text-lg leading-snug mb-2 line-clamp-2 group-hover:text-burgundy transition-colors">
          {title}
        </h3>
        {description && (
          <p className="text-gray-500 text-sm leading-6 line-clamp-2 mb-4">{description}</p>
        )}
        <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-burgundy group-hover:text-burgundyDark transition-colors">
          {t("readMore")} <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
        </span>
      </div>
    </Link>
  );
};

export default BlogCard;
