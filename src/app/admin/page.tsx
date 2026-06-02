import { getRequiredEnv } from "@/lib/env";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * License row displayed by the dashboard.
 */
interface DashboardLicense {
  /** Friendly license owner name. */
  owner_name: string | null;

  /** Optional account username. */
  username: string | null;

  /** Redacted token preview from the database view. */
  token_preview: string | null;

  /** Current license status. */
  status: string | null;

  /** Maximum number of allowed devices. */
  max_devices: number | null;

  /** Current number of active registered devices. */
  device_count: number | null;

  /** Optional expiration date. */
  expires_at: string | null;

  /** Last successful access date. */
  last_seen_at: string | null;

  /** License creation date. */
  created_at: string | null;
}

/**
 * Account snapshot row displayed by the dashboard.
 */
interface DashboardAccount {
  /** Latest account name. */
  account_name: string | null;

  /** Latest Discord handle. */
  discord: string | null;

  /** Latest country code. */
  country: string | null;

  /** Latest alliance name. */
  alliance_name: string | null;

  /** Latest account level. */
  level: number | null;

  /** Latest painted pixel count. */
  pixels_painted: number | null;

  /** Last time a painted event was accepted. */
  last_painted_at: string | null;

  /** Last URL reported by the userscript. */
  last_url: string | null;

  /** Last seen date for the snapshot. */
  last_seen_at: string | null;
}

/**
 * Script event row displayed by the dashboard.
 */
interface DashboardEvent {
  /** Event id. */
  id: number;

  /** Event type reported by the userscript. */
  event_type: string | null;

  /** Control result status. */
  status: string | null;

  /** Client IP address. */
  ip_address: string | null;

  /** Approximate country code. */
  country: string | null;

  /** Approximate city name. */
  city: string | null;

  /** Current URL reported by the userscript. */
  current_url: string | null;

  /** Account name associated with the event. */
  account_name: string | null;

  /** Event creation date. */
  created_at: string | null;
}

/**
 * Complete dashboard payload used by the server-rendered page.
 */
interface DashboardData {
  /** Account snapshot rows. */
  accounts: DashboardAccount[];

  /** Script event rows. */
  events: DashboardEvent[];

  /** License rows. */
  licenses: DashboardLicense[];
}

/**
 * Forces this route/page to render dynamically because it reads live database state.
 */
export const dynamic = "force-dynamic";

/**
 * Reads dashboard data directly from Supabase.
 * @returns Dashboard rows.
 */
async function getDashboardData(): Promise<DashboardData> {
  const [accounts, events, licenses] = await Promise.all([
    supabaseAdmin
      .from("account_snapshots")
      .select("account_name, discord, country, alliance_name, level, pixels_painted, last_seen_at, last_painted_at, last_url")
      .order("updated_at", { ascending: false })
      .limit(30),
    supabaseAdmin
      .from("script_events")
      .select("id, event_type, status, ip_address, country, city, current_url, account_name, created_at")
      .order("created_at", { ascending: false })
      .limit(40),
    supabaseAdmin
      .from("license_overview")
      .select("owner_name, username, token_preview, status, max_devices, device_count, expires_at, last_seen_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30)
  ]);

  if (accounts.error) {
    throw accounts.error;
  }

  if (events.error) {
    throw events.error;
  }

  if (licenses.error) {
    throw licenses.error;
  }

  return {
    accounts: (accounts.data ?? []) as DashboardAccount[],
    events: (events.data ?? []) as DashboardEvent[],
    licenses: (licenses.data ?? []) as DashboardLicense[]
  };
}

/**
 * Minimal admin dashboard page.
 * @param props Component props.
 * @param props.searchParams Search parameters.
 * @returns The admin dashboard page.
 */
export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const key = (await searchParams).key;

  if (key !== getRequiredEnv("ADMIN_API_KEY")) {
    return (
      <main style={{ fontFamily: "system-ui", padding: 32 }}>
        <h1>Unauthorized</h1>
        <p>Pass your admin key as <code>?key=...</code>.</p>
      </main>
    );
  }

  const data = await getDashboardData();

  return (
    <main style={{ fontFamily: "system-ui", padding: 32, lineHeight: 1.5 }}>
      <h1>control-app Dashboard</h1>

      <h2>Licenses</h2>
      <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Owner</th>
            <th>Username</th>
            <th>Token</th>
            <th>Status</th>
            <th>Devices</th>
            <th>Expires</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          {data.licenses.map((license) => (
            <tr key={`${license.owner_name}-${license.created_at}`}>
              <td>{license.owner_name}</td>
              <td>{license.username}</td>
              <td>{license.token_preview}</td>
              <td>{license.status}</td>
              <td>{license.device_count}/{license.max_devices}</td>
              <td>{license.expires_at}</td>
              <td>{license.last_seen_at}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Accounts</h2>
      <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Discord</th>
            <th>Country</th>
            <th>Alliance</th>
            <th>Level</th>
            <th>Pixels</th>
            <th>Last Painted</th>
            <th>Last URL</th>
          </tr>
        </thead>
        <tbody>
          {data.accounts.map((account) => (
            <tr key={`${account.account_name}-${account.last_seen_at}`}>
              <td>{account.account_name}</td>
              <td>{account.discord}</td>
              <td>{account.country}</td>
              <td>{account.alliance_name}</td>
              <td>{account.level}</td>
              <td>{account.pixels_painted}</td>
              <td>{account.last_painted_at}</td>
              <td style={{ maxWidth: 320, overflowWrap: "anywhere" }}>{account.last_url}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Recent Events</h2>
      <table border={1} cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>At</th>
            <th>Event</th>
            <th>Status</th>
            <th>Account</th>
            <th>IP</th>
            <th>Geo</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {data.events.map((event) => (
            <tr key={event.id}>
              <td>{event.created_at}</td>
              <td>{event.event_type}</td>
              <td>{event.status}</td>
              <td>{event.account_name}</td>
              <td>{event.ip_address}</td>
              <td>{[event.country, event.city].filter(Boolean).join(" / ")}</td>
              <td style={{ maxWidth: 320, overflowWrap: "anywhere" }}>{event.current_url}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
