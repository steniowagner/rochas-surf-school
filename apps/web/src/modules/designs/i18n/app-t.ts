import { createElement, Fragment, type ReactNode } from "react";

import { messages } from "@rochas-surf-school/app-messages";

import type { Locale } from "@/i18n/locales";

import { appLocaleBySiteLocale } from "./app-locale";

export type AppTParams = Record<string, string | number>;

export type AppTComponents = Record<string, (children: ReactNode) => ReactNode>;

const PLURAL_SUFFIXES = ["zero", "one", "two", "few", "many", "other"];

function lookup(locale: Locale, key: string): string | undefined {
  let node: unknown = messages[appLocaleBySiteLocale[locale]];
  for (const part of key.split(".")) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

function resolveTemplate(locale: Locale, key: string, params?: AppTParams): string {
  if (params && typeof params.count === "number") {
    const category = new Intl.PluralRules(appLocaleBySiteLocale[locale]).select(params.count);
    const plural = lookup(locale, `${key}_${category}`) ?? lookup(locale, `${key}_other`);
    if (plural !== undefined) return plural;
  }
  const direct = lookup(locale, key);
  if (direct === undefined) throw new Error(`Missing app message "${key}" for ${locale}`);
  return direct;
}

function interpolate(template: string, params?: AppTParams): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, name: string) => String(params?.[name] ?? ""));
}

/** The app's copy for `key` in the page language: `{{name}}` filled, plural picked from `count`. */
export function appT(locale: Locale, key: string, params?: AppTParams): string {
  return interpolate(resolveTemplate(locale, key, params), params);
}

/** Like `appT` but renders `<tag>…</tag>` through `components[tag]`; unknown tags keep their text only. */
export function appRich(locale: Locale, key: string, components: AppTComponents, params?: AppTParams): ReactNode {
  const text = appT(locale, key, params);
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const [, tag = "", inner = ""] = match;
    const render = components[tag];
    parts.push(createElement(Fragment, { key: parts.length }, render ? render(inner) : inner));
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
