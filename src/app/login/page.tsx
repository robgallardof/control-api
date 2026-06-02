import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { KeyRound } from "lucide-react";
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from "@server/admin";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getRequestDictionary } from "@/i18n/server";
import { loginAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const cookieStore = await cookies();
  const session = verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  const params = await searchParams;
  const { locale, dictionary } = await getRequestDictionary();
  const t = dictionary.login;

  if (session) {
    redirect("/admin");
  }

  return (
    <main className="app-shell flex items-center justify-center px-4 py-10">
      <section className="panel w-full max-w-md p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <LocaleToggle locale={locale} labels={dictionary.common} />
            <ThemeToggle labels={dictionary.common} />
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-normal text-[var(--foreground)]">{t.title}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">{t.subtitle}</p>
        </div>

        {params.error ? (
          <p className="mb-4 rounded-md border px-3 py-2 text-sm" style={{ borderColor: "color-mix(in srgb, var(--danger) 34%, var(--border))", background: "var(--danger-soft)", color: "var(--danger)" }}>
            {t.invalid}
          </p>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <label className="block">
            <span className="label normal-case">{t.username}</span>
            <input
              className="field h-11"
              name="username"
              autoComplete="username"
              required
            />
          </label>

          <label className="block">
            <span className="label normal-case">{t.password}</span>
            <input
              className="field h-11"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </label>

          <button
            className="btn-primary h-11 w-full"
            type="submit"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            {t.submit}
          </button>
        </form>
      </section>
    </main>
  );
}
