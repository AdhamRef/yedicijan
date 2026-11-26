"use client";
// Drawn in the browser only: dates come from the browser's own language data (ICU), which differs
// from the server's, so a server-drawn copy never matched and React reported #418.
import dynamic from "next/dynamic";
const Placeholder = () => <div className="h-24 animate-pulse rounded-lg bg-slate-100" />;
export const EmergencySwitch = dynamic(() => import("./EmergencySwitch"), { ssr: false, loading: Placeholder });
