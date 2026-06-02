import { cookies } from "next/headers";
import { defaultLocale, getDictionary, parseLocale, type Dictionary, type Locale } from "./dictionaries";
import { LOCALE_COOKIE } from "./constants";

export async function getRequestLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return parseLocale(cookieStore.get(LOCALE_COOKIE)?.value ?? defaultLocale);
}

export async function getRequestDictionary(): Promise<{ locale: Locale; dictionary: Dictionary }> {
  const locale = await getRequestLocale();
  return { locale, dictionary: getDictionary(locale) };
}
