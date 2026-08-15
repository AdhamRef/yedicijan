import React from "react";
import {
  Heart, Users, BookOpen, Home, Droplets, Stethoscope,
  Baby, Globe, Building2, Star, Leaf, GraduationCap,
  Shirt, Zap, Handshake, Wheat, HandHeart, Church,
  Ambulance, TreePine, Lightbulb, ShieldCheck, Gift,
  LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Heart,
  Users,
  BookOpen,
  Home,
  Droplets,
  Stethoscope,
  Baby,
  Globe,
  Building2,
  Star,
  Leaf,
  GraduationCap,
  Shirt,
  Zap,
  Handshake,
  Wheat,
  HandHeart,
  Church,
  Ambulance,
  TreePine,
  Lightbulb,
  ShieldCheck,
  Gift,
};

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICONS) as (keyof typeof CATEGORY_ICONS)[];

interface CategoryIconProps {
  name?: string | null;
  className?: string;
}

/** Renders the Lucide icon stored by name in category.icon. Falls back to Heart. */
const CategoryIcon = ({ name, className = "w-4 h-4" }: CategoryIconProps) => {
  const Icon = (name && CATEGORY_ICONS[name]) ? CATEGORY_ICONS[name] : Heart;
  return <Icon className={className} />;
};

export default CategoryIcon;
