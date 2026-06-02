import type { LucideIcon } from "lucide-react";
import { Activity, Ban, KeyRound, LogOut, MonitorSmartphone, ShieldCheck, Users } from "lucide-react";
import { getAdminOverview } from "@server/adminService";
import { logoutAction } from "../login/actions";
import { ActionButton } from "@/components/admin/action-button";
import { BlockRuleForm } from "@/components/admin/block-rule-form";
import { CreateLicenseForm } from "@/components/admin/create-license-form";
import { ModeControl } from "@/components/admin/mode-control";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { getRequestDictionary } from "@/i18n/server";
import { requireAdminSession } from "./session";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

export default async function AdminPage() {
  const session = await requireAdminSession();
  const overview = await getAdminOverview();
  const { locale, dictionary } = await getRequestDictionary();
  const common = dictionary.common;
  const dash = dictionary.dashboard;
  const licenses = overview.licenses as Row[];
  const accounts = overview.accounts as Row[];
  const devices = overview.devices as Row[];
  const events = overview.events as Row[];
  const blockedRules = overview.blockedRules as Row[];

  return (
    <main className="app-shell">
      <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 88%, transparent)" }}>
        <div className="app-container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <BrandLogo />
            <div className="flex shrink-0 items-center gap-2 lg:hidden">
              <LocaleToggle locale={locale} labels={common} />
              <ThemeToggle labels={common} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="hidden items-center gap-2 lg:flex">
              <LocaleToggle locale={locale} labels={common} />
              <ThemeToggle labels={common} />
            </div>
            <ModeControl mode={overview.enforcementMode} labels={common} />
            <form action={logoutAction}>
              <button className="btn-secondary" type="submit">
                <LogOut className="size-4" aria-hidden="true" />
                {common.logout}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="app-container grid gap-6 py-6 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">
          <nav className="panel sticky top-24 space-y-1 p-2">
            <NavLink href="#analytics" icon={Activity} label={dictionary.nav.analytics} />
            <NavLink href="#licenses" icon={KeyRound} label={dictionary.nav.keys} />
            <NavLink href="#accounts" icon={Users} label={dictionary.nav.users} />
            <NavLink href="#devices" icon={MonitorSmartphone} label={dictionary.nav.devices} />
            <NavLink href="#blocks" icon={Ban} label={dictionary.nav.blocks} />
          </nav>
        </aside>

        <div className="space-y-6">
          <section className="surface overflow-hidden rounded-lg">
            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-normal text-[var(--accent)]">{dash.eyebrow}</p>
                <h1 className="mt-2 text-3xl font-black tracking-normal text-[var(--foreground)] md:text-4xl">{dash.title}</h1>
                <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{dash.subtitle}</p>
              </div>
              <div className="surface-soft rounded-md px-4 py-3">
                <p className="text-xs font-bold uppercase text-[var(--muted)]">{common.session}</p>
                <p className="mt-1 font-black text-[var(--foreground)]">{session.sub}</p>
              </div>
            </div>
          </section>

          <section id="analytics" className="space-y-3">
            <SectionHeader title={dictionary.nav.analytics} description={dash.analyticsDescription} />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric label={dash.activeLicenses} value={overview.metrics.activeLicenses} hint={`${overview.metrics.totalLicenses} ${dash.total}`} icon={ShieldCheck} tone="good" />
              <Metric label={dash.blocked} value={overview.metrics.blockedLicenses} hint={`${overview.metrics.expiredLicenses} ${dash.expired}`} icon={Ban} tone="bad" />
              <Metric label={dash.users} value={overview.metrics.totalAccounts} hint={dash.snapshots} icon={Users} tone="info" />
              <Metric label={dash.devices} value={overview.metrics.totalDevices} hint={`${overview.metrics.blockedDevices} ${dash.blockedDevices}`} icon={MonitorSmartphone} tone="warn" />
              <Metric label={dash.events24h} value={overview.metrics.events24h} hint={`${overview.metrics.denied24h} ${dash.denied}`} icon={Activity} tone="neutral" />
            </div>
          </section>

          <section id="licenses" className="space-y-3">
            <SectionHeader title={dictionary.nav.keys} description={dash.keysDescription} />
            <CreateLicenseForm labels={dictionary.forms} common={common} />
            <TableShell>
              <thead>
                <tr>
                  <th>{dash.owner}</th>
                  <th>{dash.user}</th>
                  <th>{dash.token}</th>
                  <th>{common.status}</th>
                  <th>{dash.devicesShort}</th>
                  <th>{dash.expires}</th>
                  <th>{dash.lastSeen}</th>
                  <th>{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {licenses.map((license) => (
                  <tr key={text(license, "id")}>
                    <td className="font-bold text-[var(--foreground)]">{display(license, "owner_name")}</td>
                    <td>{display(license, "username")}</td>
                    <td><code>{display(license, "token_preview")}</code></td>
                    <td><StatusBadge status={license.status} /></td>
                    <td>{display(license, "device_count")}/{display(license, "max_devices")}</td>
                    <td>{formatDate(license.expires_at, locale)}</td>
                    <td>{formatDate(license.last_seen_at, locale)}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {license.status === "blocked" ? (
                          <ActionButton endpoint="/api/admin/licenses" body={{ id: license.id, status: "active" }} label={common.activate} kind="activate" />
                        ) : (
                          <ActionButton endpoint="/api/admin/licenses" body={{ id: license.id, status: "blocked" }} label={common.block} kind="block" confirmMessage={dictionary.confirmations.blockKey} />
                        )}
                        {license.status !== "expired" ? (
                          <ActionButton endpoint="/api/admin/licenses" body={{ id: license.id, status: "expired" }} label={common.expire} kind="expire" confirmMessage={dictionary.confirmations.expireKey} />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </section>

          <section id="accounts" className="space-y-3">
            <SectionHeader title={dictionary.nav.users} description={dash.usersDescription} />
            <TableShell>
              <thead>
                <tr>
                  <th>{dash.account}</th>
                  <th>{dash.discord}</th>
                  <th>{dash.country}</th>
                  <th>{dash.alliance}</th>
                  <th>{dash.level}</th>
                  <th>{dash.pixels}</th>
                  <th>{dash.lastUrl}</th>
                  <th>{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={text(account, "id")}>
                    <td>
                      <div className="font-bold text-[var(--foreground)]">{display(account, "account_name")}</div>
                      <div className="text-xs text-[var(--muted)]">{display(account, "account_id")}</div>
                    </td>
                    <td>{display(account, "discord")}</td>
                    <td>{display(account, "country")}</td>
                    <td>{display(account, "alliance_name")}</td>
                    <td>{display(account, "level")}</td>
                    <td>{display(account, "pixels_painted")}</td>
                    <td className="max-w-xs break-words text-xs">{display(account, "last_url")}</td>
                    <td>
                      {account.account_id ? (
                        <ActionButton
                          endpoint="/api/admin/block-rules"
                          method="POST"
                          body={{ type: "account", value: account.account_id, reason: `Blocked from dashboard: ${text(account, "account_name") || text(account, "account_id")}` }}
                          label={common.block}
                          kind="block"
                          confirmMessage={dictionary.confirmations.blockAccount}
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </section>

          <section id="devices" className="space-y-3">
            <SectionHeader title={dictionary.nav.devices} description={dash.devicesDescription} />
            <TableShell>
              <thead>
                <tr>
                  <th>{dash.device}</th>
                  <th>{common.status}</th>
                  <th>{dash.ip}</th>
                  <th>{dash.geo}</th>
                  <th>{dash.firstSeen}</th>
                  <th>{dash.lastSeen}</th>
                  <th>{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <tr key={text(device, "id")}>
                    <td className="max-w-xs break-all"><code>{display(device, "device_id")}</code></td>
                    <td><StatusBadge status={device.status} /></td>
                    <td>{text(device, "last_ip") || display(device, "first_ip")}</td>
                    <td>{[device.country, device.region, device.city].filter(Boolean).join(" / ") || "-"}</td>
                    <td>{formatDate(device.first_seen_at, locale)}</td>
                    <td>{formatDate(device.last_seen_at, locale)}</td>
                    <td>
                      {device.status === "blocked" ? (
                        <ActionButton endpoint="/api/admin/devices" body={{ id: device.id, status: "active" }} label={common.activate} kind="activate" />
                      ) : (
                        <ActionButton endpoint="/api/admin/devices" body={{ id: device.id, status: "blocked" }} label={common.block} kind="block" confirmMessage={dictionary.confirmations.blockDevice} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </section>

          <section id="blocks" className="space-y-3">
            <SectionHeader title={dictionary.nav.blocks} description={dash.blocksDescription} />
            <BlockRuleForm labels={dictionary.forms} common={common} />
            <TableShell>
              <thead>
                <tr>
                  <th>{dash.type}</th>
                  <th>{dash.value}</th>
                  <th>{dash.reason}</th>
                  <th>{common.status}</th>
                  <th>{dash.expires}</th>
                  <th>{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {blockedRules.map((rule) => (
                  <tr key={text(rule, "id")}>
                    <td className="font-bold">{display(rule, "type")}</td>
                    <td className="max-w-md break-all"><code>{display(rule, "value")}</code></td>
                    <td>{display(rule, "reason")}</td>
                    <td><StatusBadge status={rule.active ? "active" : "inactive"} /></td>
                    <td>{formatDate(rule.expires_at, locale)}</td>
                    <td>
                      <ActionButton
                        endpoint="/api/admin/block-rules"
                        body={{ id: rule.id, active: !rule.active }}
                        label={rule.active ? common.disable : common.activate}
                        kind={rule.active ? "disable" : "activate"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </section>

          <section className="space-y-3">
            <SectionHeader title={dictionary.nav.events} description={dash.eventsDescription} />
            <TableShell>
              <thead>
                <tr>
                  <th>{dash.date}</th>
                  <th>{dash.event}</th>
                  <th>{common.status}</th>
                  <th>{dash.account}</th>
                  <th>{dash.ip}</th>
                  <th>URL</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={text(event, "id")}>
                    <td>{formatDate(event.created_at, locale)}</td>
                    <td>{display(event, "event_type")}</td>
                    <td><StatusBadge status={event.status} /></td>
                    <td>
                      <div>{display(event, "account_name")}</div>
                      <div className="text-xs text-[var(--muted)]">{display(event, "account_id")}</div>
                    </td>
                    <td>{display(event, "ip_address")}</td>
                    <td className="max-w-sm break-words text-xs">{display(event, "current_url")}</td>
                  </tr>
                ))}
              </tbody>
            </TableShell>
          </section>
        </div>
      </div>
    </main>
  );
}

function NavLink({ href, icon: Icon, label }: { href: string; icon: LucideIcon; label: string }) {
  return (
    <a className="flex h-10 items-center gap-2 rounded-md px-3 text-sm font-bold text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--foreground)]" href={href}>
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </a>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-black tracking-normal text-[var(--foreground)]">{title}</h2>
      <p className="text-sm text-[var(--muted)]">{description}</p>
    </div>
  );
}

function Metric({ label, value, hint, icon: Icon, tone }: { label: string; value: number; hint: string; icon: LucideIcon; tone: "good" | "bad" | "info" | "warn" | "neutral" }) {
  const toneStyle = {
    good: { color: "var(--success)", background: "var(--success-soft)" },
    bad: { color: "var(--danger)", background: "var(--danger-soft)" },
    info: { color: "#2563eb", background: "color-mix(in srgb, #2563eb 12%, var(--panel))" },
    warn: { color: "var(--warning)", background: "var(--warning-soft)" },
    neutral: { color: "var(--muted-strong)", background: "var(--panel-soft)" }
  }[tone];

  return (
    <div className="panel p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-normal text-[var(--muted)]">{label}</p>
        <span className="grid size-9 place-items-center rounded-md" style={toneStyle}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-black text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="data-table">{children}</table>
    </div>
  );
}

function StatusBadge({ status }: { status: unknown }) {
  const value = String(status || "unknown");
  const tone =
    value === "active" || value === "allowed"
      ? "is-good"
      : value === "blocked" || value.includes("blocked") || value === "inactive"
        ? "is-bad"
        : "is-warn";

  return <span className={`status-pill ${tone}`}>{value}</span>;
}

function display(row: Row, key: string): string {
  return text(row, key) || "-";
}

function text(row: Row, key: string): string {
  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function formatDate(value: unknown, locale: string): string {
  if (!value) {
    return "-";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}
