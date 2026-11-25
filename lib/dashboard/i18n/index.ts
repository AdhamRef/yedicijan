import { createElement, Fragment, type ReactNode } from "react";

/**
 * Arabic-only stand-in for Minber's dashboard translation module.
 *
 * Code ported from Minber wraps dashboard labels in `dt("…")`. This dashboard has no
 * translation catalog, so the Arabic text is shown as written; only the `{0}`, `{1}`…
 * placeholders are filled. Same signatures as Minber's, so ported files compile unchanged.
 */
export function dt(text: string, params?: readonly unknown[]): string {
  return params ? text.replace(/\{(\d+)\}/g, (_, i: string) => String(params[Number(i)] ?? "")) : text;
}

/** `dt` for JSX children, where a parameter may itself be an element. */
export function dtx(text: string, params: readonly unknown[]): ReactNode {
  if (params.every((p) => p == null || typeof p !== "object")) return dt(text, params);
  return text
    .split(/\{(\d+)\}/)
    .map((part, i) => (i % 2 ? createElement(Fragment, { key: i }, params[Number(part)] as ReactNode) : part));
}

/** A list of labels, read through `dt`. */
export function dtList<T extends readonly string[]>(items: T): T {
  return items;
}
