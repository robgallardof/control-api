import type { LucideIcon } from "lucide-react";
import { Activity, Ban, BarChart3, KeyRound, LogOut, MonitorSmartphone, Radio, ShieldAlert, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { getAdminOverview } from "@server/adminService";
import { logoutAction } from "../login/actions";
import { ActionButton } from "@/components/admin/action-button";
import { BlockRuleForm } from "@/components/admin/block-rule-form";
import { ClearEventsControl } from "@/components/admin/clear-events-control";
import { CopyableValue } from "@/components/admin/copyable-value";
import { CreateLicenseForm } from "@/components/admin/create-license-form";
import { DetailsModal, type DetailItem } from "@/components/admin/details-modal";
import { LicenseEditForm } from "@/components/admin/license-edit-form";
import { ModeControl } from "@/components/admin/mode-control";
import { RealtimeRefreshControl, type RealtimeRefreshLabels } from "@/components/admin/realtime-refresh-control";
import { SearchableTable, type SearchableTableLabels } from "@/components/admin/searchable-table";
import { BrandLogo } from "@/components/brand-logo";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Dictionary } from "@/i18n/dictionaries";
import { getRequestDictionary } from "@/i18n/server";
import { requireAdminSession } from "./session";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;
type AccountTokenEntry = {
  kind: "raw" | "hash";
  value: string;
  at: string;
};
const MEXICO_TIME_ZONE = "America/Mexico_City";

export default async function AdminPage() {
  const session = await requireAdminSession();
  const overview = await getAdminOverview();
  const { locale, dictionary } = await getRequestDictionary();
  const common = dictionary.common;
  const dash = dictionary.dashboard;
  const licenses = overview.licenses as Row[];
  const devices = overview.devices as Row[];
  const events = overview.events as Row[];
  const accountTokenEvents = overview.accountTokenEvents as Row[];
  const accounts = aggregateAccounts(overview.accounts as Row[], events, accountTokenEvents);
  const blockedRules = overview.blockedRules as Row[];
  const sessionIp = session.ipAddress ?? "";
  const sessionEventCount = sessionIp ? events.filter((event) => text(event, "ip_address") === sessionIp).length : 0;
  const sessionAccountCount = sessionIp
    ? new Set(events.filter((event) => text(event, "ip_address") === sessionIp).map((event) => text(event, "account_id")).filter(Boolean)).size
    : 0;

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
            <RealtimeRefreshControl labels={refreshLabels(dash)} initialSyncedAt={new Date().toISOString()} />
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
            <NavLink href="#events" icon={Activity} label={dictionary.nav.events} />
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
                <div className="mt-2 grid gap-1 text-xs text-[var(--muted)]">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold uppercase">{dash.sessionIp}</span>
                    <code>{sessionIp || "-"}</code>
                  </div>
                  <div>{sessionAccountCount} {dash.sessionIpAccounts} · {sessionEventCount} {dash.sessionIpEvents}</div>
                </div>
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
            <AnalyticsCharts overview={overview} licenses={licenses} devices={devices} events={events} dash={dash} locale={locale} />
          </section>

          <section id="licenses" className="space-y-3">
            <SectionHeader title={dictionary.nav.keys} description={dash.keysDescription} />
            <CreateLicenseForm labels={dictionary.forms} common={common} />
            <TableShell labels={tableLabels(dash, dash.searchLicenses)}>
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
                {licenses.map((license) => {
                  const plainToken = text(license, "token_plain");
                  const tokenHash = text(license, "token_hash");
                  const tokenValue = plainToken || tokenHash;

                  return (
                    <tr key={text(license, "id")} {...dateAttributes(license, "last_seen_at", ["last_seen_at", "created_at", "expires_at"])}>
                      <td className="font-bold text-[var(--foreground)]">{display(license, "owner_name")}</td>
                      <td>{display(license, "username")}</td>
                      <td className="min-w-80">
                        <CopyableValue value={tokenValue} labels={common} compact />
                        {plainToken && tokenHash ? (
                          <div className="mt-2 grid gap-1">
                            <span className="text-xs font-bold uppercase text-[var(--muted)]">{dash.tokenHash}</span>
                            <CopyableValue value={tokenHash} labels={common} compact />
                          </div>
                        ) : null}
                      </td>
                      <td><StatusBadge status={license.status} /></td>
                      <td>{display(license, "device_count")}/{display(license, "max_devices")}</td>
                      <td>{formatDate(license.expires_at, locale)}</td>
                      <td>{formatDate(license.last_seen_at, locale)}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          <LicenseEditForm
                            license={{
                              id: text(license, "id"),
                              ownerName: text(license, "owner_name"),
                              username: text(license, "username"),
                              status: text(license, "status"),
                              maxDevices: numberValue(license.max_devices, 1),
                              expiresAt: text(license, "expires_at")
                            }}
                            labels={dash}
                            common={common}
                          />
                          {license.status !== "active" ? (
                            <ActionButton endpoint="/api/admin/licenses" body={{ id: license.id, status: "active" }} label={common.activate} kind="activate" />
                          ) : null}
                          {license.status === "active" ? (
                            <ActionButton endpoint="/api/admin/licenses" body={{ id: license.id, status: "inactive" }} label={common.disable} kind="disable" confirmMessage={dictionary.confirmations.deactivateKey} confirmLabel={common.confirm} cancelLabel={common.cancel} />
                          ) : null}
                          {license.status !== "blocked" ? (
                            <ActionButton endpoint="/api/admin/licenses" body={{ id: license.id, status: "blocked" }} label={common.block} kind="block" confirmMessage={dictionary.confirmations.blockKey} confirmLabel={common.confirm} cancelLabel={common.cancel} />
                          ) : null}
                          {license.status !== "expired" ? (
                            <ActionButton endpoint="/api/admin/licenses" body={{ id: license.id, status: "expired" }} label={common.expire} kind="expire" confirmMessage={dictionary.confirmations.expireKey} confirmLabel={common.confirm} cancelLabel={common.cancel} />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          </section>

          <section id="accounts" className="space-y-3">
            <SectionHeader title={dictionary.nav.users} description={dash.usersDescription} />
            <TableShell labels={tableLabels(dash, dash.searchAccounts)}>
              <thead>
                <tr>
                  <th>{dash.account}</th>
                  <th>{dash.discord}</th>
                  <th>{dash.stats}</th>
                  <th>{dash.accountToken}</th>
                  <th>{dash.activity}</th>
                  <th>{dash.lastUrl}</th>
                  <th>{common.actions}</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((account) => {
                  const accountName = text(account, "account_name") || text(account, "account_id");
                  const accountTokens = tokenEntries(account);
                  const accountTokenRaw = accountTokens.find((entry) => entry.kind === "raw")?.value ?? "";
                  const tokenHash = accountTokens.find((entry) => entry.kind === "hash")?.value ?? "";
                  const blockTokenValue = accountTokenRaw || tokenHash;
                  const blockTokenType = accountTokenRaw ? "account_token" : "account_token_hash";
                  const accountEventIps = stringList(account, "_event_ips");
                  const isSessionAccount = Boolean(sessionIp && accountEventIps.includes(sessionIp));

                  return (
                    <tr className={isSessionAccount ? "session-linked-row" : undefined} key={text(account, "_group_key") || text(account, "id")} {...dateAttributes(account, "_latest_seen_at", ["_latest_seen_at", "updated_at", "last_seen_at", "last_painted_at", "timeout_until"])}>
                      <td className="min-w-60">
                        <div className="font-bold text-[var(--foreground)]">{display(account, "account_name")}</div>
                        <div className="text-xs text-[var(--muted)]">{display(account, "account_id")}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">{formatAccountGroupMeta(account, dash)}</div>
                        {isSessionAccount ? <div className="mt-2"><SessionIpBadge label={dash.sessionIpMatch} /></div> : null}
                        {accountEventIps.length ? <div className="mt-2 text-xs text-[var(--muted)]">{dash.eventIps}: {accountEventIps.slice(0, 3).join(", ")}</div> : null}
                        <div className="mt-2">
                          <DetailsModal
                            title={`${dash.accountDetails}: ${accountName || "-"}`}
                            triggerLabel={dash.viewDetails}
                            closeLabel={common.close}
                            copyLabels={common}
                            items={accountDetailItems(account, dash, locale)}
                          />
                        </div>
                      </td>
                      <td>
                        <div>{display(account, "discord")}</div>
                        <div className="text-xs text-[var(--muted)]">{display(account, "discord_id")}</div>
                        <div className="mt-2 text-xs">{display(account, "alliance_name")}</div>
                      </td>
                      <td>
                        <div>{dash.level}: <b>{formatNumber(account.level, locale)}</b></div>
                        <div>{dash.pixels}: <b>{formatNumber(account.pixels_painted, locale)}</b></div>
                        <div>{dash.droplets}: <b>{formatNumber(account.droplets, locale)}</b></div>
                        <div>{dash.charges}: <b>{formatCharges(account, locale)}</b></div>
                      </td>
                      <td className="min-w-56 max-w-72">
                        <TokenSummary
                          title={`${dash.accountToken}: ${accountName || "-"}`}
                          entries={accountTokens}
                          dash={dash}
                          common={common}
                          locale={locale}
                        />
                      </td>
                      <td>
                        <div>{dash.lastSeen}: {formatDate(account.last_seen_at, locale)}</div>
                        <div>{dash.lastPainted}: {formatDate(account.last_painted_at, locale)}</div>
                        <div>{dash.timeout}: {formatDate(account.timeout_until, locale)}</div>
                        <div>{dash.suspension}: {display(account, "suspension_reason")}</div>
                      </td>
                      <td className="max-w-xs break-words text-xs">{display(account, "last_url")}</td>
                      <td>
                        <div className="flex flex-wrap gap-2">
                          {account.account_id ? (
                            <ActionButton
                              endpoint="/api/admin/block-rules"
                              method="POST"
                              body={{ type: "account", value: account.account_id, reason: `Blocked from dashboard: ${accountName}` }}
                              label={common.block}
                              kind="block"
                              confirmMessage={dictionary.confirmations.blockAccount}
                              confirmLabel={common.confirm}
                              cancelLabel={common.cancel}
                            />
                          ) : null}
                          {blockTokenValue ? (
                            <ActionButton
                              endpoint="/api/admin/block-rules"
                              method="POST"
                              body={{ type: blockTokenType, value: blockTokenValue, reason: `Blocked Wplace j token from dashboard: ${accountName}` }}
                              label={locale === "en" ? "Block j" : "Bloquear j"}
                              kind="block"
                              confirmMessage={dictionary.confirmations.blockAccountToken}
                              confirmLabel={common.confirm}
                              cancelLabel={common.cancel}
                            />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </TableShell>
          </section>

          <section id="devices" className="space-y-3">
            <SectionHeader title={dictionary.nav.devices} description={dash.devicesDescription} />
            <TableShell labels={tableLabels(dash, dash.searchDevices)}>
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
                  <tr key={text(device, "id")} {...dateAttributes(device, "last_seen_at", ["last_seen_at", "first_seen_at"])}>
                    <td className="min-w-72"><CopyableValue value={text(device, "device_id")} labels={common} compact /></td>
                    <td><StatusBadge status={device.status} /></td>
                    <td>{text(device, "last_ip") || display(device, "first_ip")}</td>
                    <td><GeoSummary row={device} dash={dash} locale={locale} /></td>
                    <td>{formatDate(device.first_seen_at, locale)}</td>
                    <td>{formatDate(device.last_seen_at, locale)}</td>
                    <td>
                      {device.status === "blocked" ? (
                        <ActionButton endpoint="/api/admin/devices" body={{ id: device.id, status: "active" }} label={common.activate} kind="activate" />
                      ) : (
                        <ActionButton endpoint="/api/admin/devices" body={{ id: device.id, status: "blocked" }} label={common.block} kind="block" confirmMessage={dictionary.confirmations.blockDevice} confirmLabel={common.confirm} cancelLabel={common.cancel} />
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
            <TableShell labels={tableLabels(dash, dash.searchBlocks)}>
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
                  <tr key={text(rule, "id")} {...dateAttributes(rule, "created_at", ["created_at", "expires_at"])}>
                    <td className="font-bold">{display(rule, "type")}</td>
                    <td className="min-w-80"><CopyableValue value={text(rule, "value")} labels={common} compact /></td>
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

          <section id="events" className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <SectionHeader title={dictionary.nav.events} description={dash.eventsDescription} />
              <ClearEventsControl labels={dash} common={common} />
            </div>
            <div className="grid gap-3 xl:grid-cols-[290px_1fr]">
              <EventsSidebar events={events} dash={dash} locale={locale} />
              <TableShell labels={tableLabels(dash, dash.searchEvents)}>
                <thead>
                  <tr>
                    <th>{dash.date}</th>
                    <th>{dash.event}</th>
                    <th>{common.status}</th>
                    <th>{dash.account}</th>
                    <th>{dash.accountToken}</th>
                    <th>{dash.ip}</th>
                    <th>URL</th>
                    <th>{dash.details}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event) => {
                    const eventTokens = tokenEntriesFromRow(event);
                    const isSessionEvent = Boolean(sessionIp && text(event, "ip_address") === sessionIp);

                    return (
                      <tr className={isSessionEvent ? "session-linked-row" : undefined} key={text(event, "id")} {...dateAttributes(event, "created_at", ["created_at"])}>
                        <td>{formatDate(event.created_at, locale)}</td>
                        <td>{display(event, "event_type")}</td>
                        <td><StatusBadge status={event.status} /></td>
                        <td>
                          <div>{display(event, "account_name")}</div>
                          <div className="text-xs text-[var(--muted)]">{display(event, "account_id")}</div>
                        </td>
                        <td className="min-w-56 max-w-72">
                          <div className="text-xs font-bold uppercase text-[var(--muted)]">{dash.tokenSource}</div>
                          <div className="text-sm">{metadataText(event, "accountTokenSource") || "-"}</div>
                          <div className="mt-2">
                            <TokenSummary
                              title={`${dash.accountToken}: ${display(event, "account_name")}`}
                              entries={eventTokens}
                              dash={dash}
                              common={common}
                              locale={locale}
                            />
                          </div>
                        </td>
                        <td>
                          <div>{display(event, "ip_address")}</div>
                          {isSessionEvent ? <div className="mt-1"><SessionIpBadge label={dash.sessionIpMatch} /></div> : null}
                          <div className="mt-1"><GeoSummary row={event} dash={dash} locale={locale} compact /></div>
                        </td>
                        <td className="max-w-sm break-words text-xs">{display(event, "current_url")}</td>
                        <td>
                          <DetailsModal
                            title={`${dash.eventDetails}: ${display(event, "event_type")}`}
                            triggerLabel={dash.viewDetails}
                            closeLabel={common.close}
                            copyLabels={common}
                            items={eventDetailItems(event, dash, common, locale)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </TableShell>
            </div>
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

function AnalyticsCharts({
  overview,
  licenses,
  devices,
  events,
  dash,
  locale
}: {
  overview: Awaited<ReturnType<typeof getAdminOverview>>;
  licenses: Row[];
  devices: Row[];
  events: Row[];
  dash: Dictionary["dashboard"];
  locale: string;
}) {
  const activeDevices = devices.filter((device) => text(device, "status") === "active").length;
  const blockedDevices = devices.filter((device) => text(device, "status") === "blocked").length;
  const allowedEvents = events.filter((event) => text(event, "status") === "allowed").length;
  const deniedEvents = events.length - allowedEvents;
  const tokenCaptures = events.filter((event) => text(event, "account_token_raw") || text(event, "account_token_hash")).length;

  return (
    <div className="analytics-grid">
      <ChartPanel title={dash.licenseMix} subtitle={`${overview.metrics.totalLicenses} ${dash.total}`} icon={BarChart3}>
        <BarList
          items={[
            { label: dash.statusActive, count: overview.metrics.activeLicenses, tone: "good" },
            { label: dash.statusInactive, count: licenses.filter((license) => text(license, "status") === "inactive").length, tone: "warn" },
            { label: dash.statusBlocked, count: overview.metrics.blockedLicenses, tone: "bad" },
            { label: dash.statusExpired, count: overview.metrics.expiredLicenses, tone: "neutral" }
          ]}
        />
      </ChartPanel>

      <ChartPanel title={dash.eventTrend} subtitle={dash.last12Hours} icon={TrendingUp}>
        <TimelineChart buckets={eventBuckets(events, locale)} />
      </ChartPanel>

      <ChartPanel title={dash.eventStatusMix} subtitle={`${events.length} ${dash.listedEvents}`} icon={Activity}>
        <BarList
          items={[
            { label: dash.allowedEvents, count: allowedEvents, tone: "good" },
            { label: dash.deniedEvents, count: deniedEvents, tone: "bad" },
            { label: dash.tokenCaptures, count: tokenCaptures, tone: "info" }
          ]}
        />
      </ChartPanel>

      <ChartPanel title={dash.deviceHealth} subtitle={`${devices.length} ${dash.devices}`} icon={MonitorSmartphone}>
        <BarList
          items={[
            { label: dash.activeDevices, count: activeDevices, tone: "good" },
            { label: dash.blockedDevices, count: blockedDevices, tone: "bad" }
          ]}
        />
      </ChartPanel>
    </div>
  );
}

function ChartPanel({ title, subtitle, icon: Icon, children }: { title: string; subtitle: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="chart-panel">
      <div className="chart-panel-head">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="chart-icon">
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      {children}
    </div>
  );
}

function BarList({ items }: { items: Array<{ label: string; count: number; tone: "good" | "bad" | "info" | "warn" | "neutral" }> }) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="bar-list">
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-row-label">
            <span>{item.label}</span>
            <strong>{item.count}</strong>
          </div>
          <div className="bar-track" aria-hidden="true">
            <span className={`bar-fill is-${item.tone}`} style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineChart({ buckets }: { buckets: Array<{ label: string; count: number; denied: number }> }) {
  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);

  return (
    <div className="timeline-chart">
      {buckets.map((bucket) => {
        const height = bucket.count === 0 ? 4 : Math.max(12, (bucket.count / max) * 100);
        const deniedHeight = bucket.count === 0 ? 0 : Math.max(4, (bucket.denied / bucket.count) * height);

        return (
          <div className="timeline-column" key={bucket.label}>
            <div className="timeline-bar" title={`${bucket.label}: ${bucket.count}`}>
              <span className="timeline-fill" style={{ height: `${height}%` }} />
              {bucket.denied ? <span className="timeline-denied" style={{ height: `${deniedHeight}%` }} /> : null}
            </div>
            <span>{bucket.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function EventsSidebar({ events, dash, locale }: { events: Row[]; dash: Dictionary["dashboard"]; locale: string }) {
  const total = events.length;
  const allowed = events.filter((event) => text(event, "status") === "allowed").length;
  const denied = total - allowed;
  const tokenCaptures = events.filter((event) => text(event, "account_token_raw") || text(event, "account_token_hash")).length;
  const latest = events[0]?.created_at;
  const statuses = topCounts(events.map((event) => display(event, "status")));
  const types = topCounts(events.map((event) => display(event, "event_type")));
  const countries = topCounts(events.map((event) => text(event, "country_name") || text(event, "country") || text(event, "city") || "-"));

  return (
    <aside className="panel grid gap-3 p-4 xl:sticky xl:top-24 xl:self-start">
      <div>
        <p className="text-xs font-black uppercase text-[var(--accent)]">{dash.eventSidebarTitle}</p>
        <p className="mt-1 text-sm text-[var(--muted)]">{dash.latestEvent}: {formatDate(latest, locale)}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        <SidebarMetric label={dash.listedEvents} value={total} icon={Radio} tone="neutral" />
        <SidebarMetric label={dash.allowedEvents} value={allowed} icon={ShieldCheck} tone="good" />
        <SidebarMetric label={dash.deniedEvents} value={denied} icon={ShieldAlert} tone="bad" />
        <SidebarMetric label={dash.tokenCaptures} value={tokenCaptures} icon={KeyRound} tone="info" />
      </div>

      <CountList title={dash.statusBreakdown} items={statuses} />
      <CountList title={dash.typeBreakdown} items={types} />
      <CountList title={dash.countryBreakdown} items={countries} />
    </aside>
  );
}

function SidebarMetric({ label, value, icon: Icon, tone }: { label: string; value: number; icon: LucideIcon; tone: "good" | "bad" | "info" | "neutral" }) {
  const toneStyle = {
    good: { color: "var(--success)", background: "var(--success-soft)" },
    bad: { color: "var(--danger)", background: "var(--danger-soft)" },
    info: { color: "#2563eb", background: "color-mix(in srgb, #2563eb 12%, var(--panel))" },
    neutral: { color: "var(--muted-strong)", background: "var(--panel-soft)" }
  }[tone];

  return (
    <div className="rounded-md bg-[var(--panel-soft)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-md" style={toneStyle}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <span className="text-2xl font-black text-[var(--foreground)]">{value}</span>
      </div>
      <p className="mt-2 text-xs font-black uppercase text-[var(--muted)]">{label}</p>
    </div>
  );
}

function CountList({ title, items }: { title: string; items: Array<{ label: string; count: number }> }) {
  return (
    <div className="grid gap-2">
      <h3 className="text-xs font-black uppercase text-[var(--muted)]">{title}</h3>
      <div className="grid gap-1.5">
        {items.length ? (
          items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 rounded-md border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>
              <span className="min-w-0 break-words text-[var(--foreground)]">{item.label}</span>
              <span className="status-pill">{item.count}</span>
            </div>
          ))
        ) : (
          <div className="rounded-md border px-2 py-1.5 text-sm text-[var(--muted)]" style={{ borderColor: "var(--border)", background: "var(--panel-soft)" }}>-</div>
        )}
      </div>
    </div>
  );
}

function GeoSummary({ row, dash, locale, compact = false }: { row: Row; dash: Dictionary["dashboard"]; locale: string; compact?: boolean }) {
  const sector = [
    text(row, "city"),
    text(row, "region_name") || text(row, "region"),
    text(row, "country_name") || text(row, "country"),
    text(row, "zip")
  ].filter(Boolean);
  const coordinates = formatCoordinates(row, locale);
  const provider = [text(row, "isp"), text(row, "organization")].filter(Boolean);

  return (
    <div className={compact ? "grid gap-0.5 text-xs" : "grid gap-1 text-sm"}>
      <div className="font-bold text-[var(--foreground)]">{sector.join(" / ") || "-"}</div>
      {coordinates ? <div className="text-xs text-[var(--muted)]">{dash.coordinates}: {coordinates}</div> : null}
      {provider.length ? <div className="text-xs text-[var(--muted)]">{provider.join(" / ")}</div> : null}
      {text(row, "geo_source") ? <div className="text-xs text-[var(--muted)]">{dash.geoSource}: {display(row, "geo_source")}</div> : null}
    </div>
  );
}

function TableShell({
  children,
  labels
}: {
  children: React.ReactNode;
  labels: SearchableTableLabels;
}) {
  return <SearchableTable labels={labels}>{children}</SearchableTable>;
}

function tableLabels(dash: Dictionary["dashboard"], placeholder: string): SearchableTableLabels {
  return {
    search: dash.search,
    placeholder,
    results: dash.searchResults,
    noResults: dash.noSearchResults,
    dateFrom: dash.dateFrom,
    dateTo: dash.dateTo,
    orderByDate: dash.orderByDate,
    newestFirst: dash.newestFirst,
    oldestFirst: dash.oldestFirst,
    clearFilters: dash.clearFilters
  };
}

function refreshLabels(dash: Dictionary["dashboard"]): RealtimeRefreshLabels {
  return {
    refreshNow: dash.refreshNow,
    refreshing: dash.refreshing,
    autoRefreshOn: dash.autoRefreshOn,
    autoRefreshOff: dash.autoRefreshOff,
    pauseAutoRefresh: dash.pauseAutoRefresh,
    resumeAutoRefresh: dash.resumeAutoRefresh,
    lastRefresh: dash.lastRefresh
  };
}

function dateAttributes(row: Row, sortKey: string, filterKeys: string[]) {
  const sortDate = text(row, sortKey);
  const filterDates = filterKeys.map((key) => text(row, key)).filter(isValidDateText);

  return {
    "data-sort-date": isValidDateText(sortDate) ? sortDate : filterDates[0] ?? "",
    "data-filter-dates": filterDates.join("|")
  };
}

function StatusBadge({ status }: { status: unknown }) {
  const value = String(status || "unknown");
  const tone =
    value === "active" || value === "allowed"
      ? "is-good"
      : value === "blocked" || value.includes("blocked")
        ? "is-bad"
        : "is-warn";

  return <span className={`status-pill ${tone}`}>{value}</span>;
}

function SessionIpBadge({ label }: { label: string }) {
  return <span className="session-ip-badge">{label}</span>;
}

function TokenSummary({
  title,
  entries,
  dash,
  common,
  locale
}: {
  title: string;
  entries: AccountTokenEntry[];
  dash: Dictionary["dashboard"];
  common: Dictionary["common"];
  locale: string;
}) {
  const primary = entries[0]?.value ?? "";

  if (!entries.length || !primary) {
    return <StatusBadge status="missing" />;
  }

  return (
    <div className="token-summary">
      <div className="token-summary-row">
        <span className="status-pill">{entries.length}</span>
        <code className="token-preview" title={primary}>{shortToken(primary)}</code>
      </div>
      <DetailsModal
        title={title}
        triggerLabel={dash.viewMore}
        closeLabel={common.close}
        copyLabels={common}
        items={tokenDetailItems(entries, dash, locale)}
      />
    </div>
  );
}

function display(row: Row, key: string): string {
  return text(row, key) || "-";
}

function accountDetailItems(account: Row, dash: Dictionary["dashboard"], locale: string): DetailItem[] {
  const tokens = tokenEntries(account);

  return [
    { label: dash.account, value: display(account, "account_name") },
    { label: dash.accountId, value: display(account, "account_id"), copy: true },
    { label: dash.licenseId, value: joinedList(account, "_license_ids", "license_id"), copy: true, wide: true },
    { label: dash.deviceId, value: joinedList(account, "_device_ids", "device_id"), copy: true, wide: true },
    { label: dash.country, value: display(account, "country") },
    { label: dash.role, value: display(account, "role") },
    { label: dash.customer, value: formatBoolean(account.is_customer, locale) },
    { label: dash.discord, value: display(account, "discord") },
    { label: dash.discordId, value: display(account, "discord_id"), copy: true },
    { label: dash.alliance, value: display(account, "alliance_name") },
    { label: dash.allianceId, value: display(account, "alliance_id"), copy: true },
    { label: dash.level, value: formatNumber(account.level, locale) },
    { label: dash.pixels, value: formatNumber(account.pixels_painted, locale) },
    { label: dash.droplets, value: formatNumber(account.droplets, locale) },
    { label: dash.charges, value: formatCharges(account, locale) },
    ...tokenDetailItems(tokens, dash, locale),
    { label: dash.pictureHash, value: text(account, "picture_hash"), copy: true, wide: true },
    { label: dash.lastSeen, value: formatDate(account.last_seen_at, locale) },
    { label: dash.lastPainted, value: formatDate(account.last_painted_at, locale) },
    { label: dash.timeout, value: formatDate(account.timeout_until, locale) },
    { label: dash.suspension, value: display(account, "suspension_reason"), wide: true },
    { label: dash.lastUrl, value: display(account, "last_url"), copy: true, wide: true },
    { label: dash.updatedAt, value: formatDate(account.updated_at, locale) },
    { label: dash.rawProfile, value: jsonText(account.raw_profile), copy: true, wide: true }
  ];
}

function eventDetailItems(event: Row, dash: Dictionary["dashboard"], common: Dictionary["common"], locale: string): DetailItem[] {
  return [
    { label: dash.date, value: formatDate(event.created_at, locale) },
    { label: dash.event, value: display(event, "event_type") },
    { label: common.status, value: display(event, "status") },
    { label: dash.licenseId, value: display(event, "license_id"), copy: true },
    { label: dash.deviceId, value: display(event, "device_id"), copy: true },
    { label: dash.account, value: display(event, "account_name") },
    { label: dash.accountId, value: display(event, "account_id"), copy: true },
    { label: dash.tokenSource, value: metadataText(event, "accountTokenSource") || "-" },
    { label: dash.accountTokenReceived, value: text(event, "account_token_raw"), copy: true, wide: true },
    { label: dash.tokenHash, value: text(event, "account_token_hash"), copy: true, wide: true },
    { label: dash.ip, value: display(event, "ip_address"), copy: true },
    { label: dash.country, value: display(event, "country") },
    { label: dash.countryName, value: display(event, "country_name") },
    { label: dash.region, value: display(event, "region") },
    { label: dash.regionName, value: display(event, "region_name") },
    { label: dash.city, value: display(event, "city") },
    { label: dash.zip, value: display(event, "zip") },
    { label: dash.coordinates, value: formatCoordinates(event, locale), copy: true },
    { label: dash.timezone, value: display(event, "timezone") },
    { label: dash.isp, value: display(event, "isp") },
    { label: dash.organization, value: display(event, "organization") },
    { label: dash.asn, value: display(event, "asn"), copy: true },
    { label: dash.geoSource, value: display(event, "geo_source") },
    { label: dash.scriptVersion, value: display(event, "script_version") },
    { label: dash.storageKey, value: text(event, "storage_key"), copy: true, wide: true },
    { label: dash.lastUrl, value: display(event, "current_url"), copy: true, wide: true },
    { label: dash.userAgent, value: display(event, "user_agent"), copy: true, wide: true },
    { label: dash.ipApiGeo, value: jsonText(event.ip_geo), copy: true, wide: true },
    { label: dash.metadata, value: jsonText(event.metadata), copy: true, wide: true }
  ];
}

function aggregateAccounts(accounts: Row[], events: Row[], accountTokenEvents: Row[]): Row[] {
  const groups = new Map<string, Row>();

  for (const account of accounts) {
    mergeAccountGroup(groups, account, "snapshot");
  }

  for (const event of accountTokenEvents) {
    if (!text(event, "account_id")) {
      continue;
    }
    mergeAccountGroup(groups, event, "token_event");
  }

  for (const event of events) {
    if (!text(event, "account_id")) {
      continue;
    }
    mergeAccountGroup(groups, event, "event");
  }

  return Array.from(groups.values()).sort((a, b) => latestAccountTime(b) - latestAccountTime(a));
}

function mergeAccountGroup(groups: Map<string, Row>, row: Row, source: "snapshot" | "event" | "token_event") {
  const groupKey = accountGroupKey(row);
  const current = groups.get(groupKey);
  const currentTime = current ? latestAccountTime(current) : 0;
  const incomingTime = latestAccountTime(row);
  const next: Row = current ? { ...current } : {};
  const incomingIsNewer = incomingTime >= currentTime;

  for (const [key, value] of Object.entries(row)) {
    if (!hasValue(value)) {
      continue;
    }

    if (incomingIsNewer || !hasValue(next[key])) {
      next[key] = value;
    }
  }

  next._group_key = groupKey;
  next._latest_seen_at = new Date(Math.max(currentTime, incomingTime)).toISOString();
  next._snapshot_count = numberValue(next._snapshot_count, 0) + (source === "snapshot" ? 1 : 0);
  next._event_count = numberValue(next._event_count, 0) + (source === "event" || source === "token_event" ? 1 : 0);
  next._license_ids = appendUnique(stringList(next, "_license_ids"), text(row, "license_id"));
  next._device_ids = appendUnique(stringList(next, "_device_ids"), text(row, "device_id"));
  next._event_ips = appendUnique(stringList(next, "_event_ips"), text(row, "ip_address"));
  appendTokenEntry(next, row, "account_token_raw", "raw");
  appendTokenEntry(next, row, "account_token_hash", "hash");

  groups.set(groupKey, next);
}

function accountGroupKey(row: Row) {
  return text(row, "account_id") || text(row, "discord_id") || text(row, "id") || `${text(row, "license_id")}:${text(row, "device_id")}`;
}

function latestAccountTime(row: Row) {
  const candidates = ["updated_at", "last_seen_at", "last_painted_at", "created_at"]
    .map((key) => new Date(text(row, key)).getTime())
    .filter(Number.isFinite);

  return candidates.length ? Math.max(...candidates) : 0;
}

function formatAccountGroupMeta(account: Row, dash: Dictionary["dashboard"]) {
  const snapshots = numberValue(account._snapshot_count, 0);
  const devices = stringList(account, "_device_ids").length;
  const tokens = tokenEntries(account).length;

  return `${snapshots} ${dash.snapshots} · ${devices} ${dash.devicesShort} · ${tokens} ${dash.tokenCaptures}`;
}

function tokenDetailItems(entries: AccountTokenEntry[], dash: Dictionary["dashboard"], locale: string): DetailItem[] {
  return entries.map((entry, index) => {
    const kindLabel = entry.kind === "raw" ? dash.accountTokenReceived : dash.tokenHash;
    const dateLabel = entry.at ? formatDate(entry.at, locale) : "-";

    return {
      label: `${kindLabel} ${index + 1} · ${dateLabel}`,
      value: entry.value,
      copy: true,
      wide: true
    };
  });
}

function text(row: Row, key: string): string {
  const value = row[key];

  if (value === null || value === undefined || value === "") {
    return "";
  }

  return String(value);
}

function hasValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function stringList(row: Row, key: string): string[] {
  const value = row[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => String(item)).filter(Boolean);
}

function appendUnique(values: string[], value: string) {
  if (value && !values.includes(value)) {
    return [...values, value];
  }

  return values;
}

function appendTokenEntry(target: Row, source: Row, field: "account_token_raw" | "account_token_hash", kind: AccountTokenEntry["kind"]) {
  const value = text(source, field);
  if (!value) {
    return;
  }

  const at = tokenEntryDate(source);
  const entries = tokenEntries(target);
  const existing = entries.find((entry) => entry.kind === kind && entry.value === value);

  if (existing) {
    if (tokenTime(at) > tokenTime(existing.at)) {
      existing.at = at;
    }
  } else {
    entries.push({ kind, value, at });
  }

  target._account_token_entries = entries.sort(compareTokenEntries);
}

function tokenEntries(row: Row): AccountTokenEntry[] {
  const value = row._account_token_entries;

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is AccountTokenEntry => {
      if (typeof entry !== "object" || entry === null) {
        return false;
      }
      const candidate = entry as Partial<AccountTokenEntry>;
      return (candidate.kind === "raw" || candidate.kind === "hash") && typeof candidate.value === "string" && candidate.value.length > 0;
    })
    .sort(compareTokenEntries);
}

function tokenEntriesFromRow(row: Row): AccountTokenEntry[] {
  return ([
    tokenEntryFromField(row, "account_token_raw", "raw"),
    tokenEntryFromField(row, "account_token_hash", "hash")
  ].filter(Boolean) as AccountTokenEntry[]).sort(compareTokenEntries);
}

function tokenEntryFromField(row: Row, field: "account_token_raw" | "account_token_hash", kind: AccountTokenEntry["kind"]): AccountTokenEntry | null {
  const value = text(row, field);
  return value ? { kind, value, at: tokenEntryDate(row) } : null;
}

function tokenEntryDate(row: Row) {
  return text(row, "created_at") || text(row, "updated_at") || text(row, "last_seen_at") || "";
}

function compareTokenEntries(a: AccountTokenEntry, b: AccountTokenEntry) {
  return tokenTime(b.at) - tokenTime(a.at) || tokenKindRank(a.kind) - tokenKindRank(b.kind) || a.value.localeCompare(b.value);
}

function tokenTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function tokenKindRank(kind: AccountTokenEntry["kind"]) {
  return kind === "raw" ? 0 : 1;
}

function joinedList(row: Row, listKey: string, fallbackKey: string) {
  const values = stringList(row, listKey);
  if (values.length) {
    return values.join("\n");
  }

  return display(row, fallbackKey);
}

function shortToken(value: string) {
  if (value.length <= 22) {
    return value;
  }

  return `${value.slice(0, 10)}...${value.slice(-8)}`;
}

function formatBoolean(value: unknown, locale: string): string {
  if (typeof value !== "boolean") {
    return "-";
  }

  if (locale === "en") {
    return value ? "yes" : "no";
  }

  return value ? "si" : "no";
}

function formatNumber(value: unknown, locale: string): string {
  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return "-";
  }

  return new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX", {
    maximumFractionDigits: 2
  }).format(number);
}

function formatCharges(row: Row, locale: string): string {
  const charges = rawRecord(row, "charges");

  if (!charges) {
    return "-";
  }

  const count = formatNumber(charges.count, locale);
  const max = formatNumber(charges.max, locale);
  const cooldownMs = typeof charges.cooldownMs === "number" ? Math.round(charges.cooldownMs / 1000) : null;

  return cooldownMs === null ? `${count}/${max}` : `${count}/${max} (${cooldownMs}s)`;
}

function formatCoordinates(row: Row, locale: string): string {
  const latitude = numberValue(row.latitude, Number.NaN);
  const longitude = numberValue(row.longitude, Number.NaN);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "";
  }

  const formatter = new Intl.NumberFormat(locale === "en" ? "en-US" : "es-MX", {
    maximumFractionDigits: 4
  });

  return `${formatter.format(latitude)}, ${formatter.format(longitude)}`;
}

function topCounts(values: string[], limit = 5): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>();

  for (const value of values) {
    const label = value || "-";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function eventBuckets(events: Row[], locale: string): Array<{ label: string; count: number; denied: number }> {
  const bucketCount = 12;
  const bucketMs = 60 * 60 * 1000;
  const now = Date.now();
  const start = now - (bucketCount - 1) * bucketMs;
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const time = start + index * bucketMs;

    return {
      label: new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-MX", {
        timeZone: MEXICO_TIME_ZONE,
        hour: "2-digit"
      }).format(new Date(time)),
      start: time,
      end: time + bucketMs,
      count: 0,
      denied: 0
    };
  });

  for (const event of events) {
    const time = new Date(text(event, "created_at")).getTime();

    if (!Number.isFinite(time) || time < start || time > now + bucketMs) {
      continue;
    }

    const index = Math.min(bucketCount - 1, Math.max(0, Math.floor((time - start) / bucketMs)));
    buckets[index].count += 1;

    if (text(event, "status") !== "allowed") {
      buckets[index].denied += 1;
    }
  }

  return buckets.map(({ label, count, denied }) => ({ label, count, denied }));
}

function numberValue(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function isValidDateText(value: string) {
  if (!value) {
    return false;
  }

  return Number.isFinite(new Date(value).getTime());
}

function rawRecord(row: Row, key: string): Row | null {
  const raw = row.raw_profile;

  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const value = (raw as Row)[key];

  return typeof value === "object" && value !== null ? (value as Row) : null;
}

function metadataText(row: Row, key: string): string {
  const metadata = row.metadata;

  if (typeof metadata !== "object" || metadata === null) {
    return "";
  }

  const value = (metadata as Row)[key];

  return value === null || value === undefined ? "" : String(value);
}

function jsonText(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
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
    timeZone: MEXICO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(date) + " MX";
}
