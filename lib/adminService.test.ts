import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminOverview } from "./adminService";
import { getSupabaseAdmin } from "./supabaseAdmin";

vi.mock("./supabaseAdmin", () => ({ getSupabaseAdmin: vi.fn() }));

describe("dashboard history budget", () => {
  let queries: Array<Record<string, ReturnType<typeof vi.fn>>>;

  beforeEach(() => {
    queries = [];
    vi.mocked(getSupabaseAdmin).mockReturnValue({
      from: vi.fn(() => {
        const query: Record<string, ReturnType<typeof vi.fn>> = {};
        for (const method of ["select", "order", "limit", "eq", "maybeSingle", "gte", "neq", "not", "or"]) {
          query[method] = vi.fn().mockReturnValue(query);
        }
        query.then = vi.fn((resolve) => resolve({ data: [], error: null, count: 0 }));
        queries.push(query);
        return query;
      })
    } as unknown as ReturnType<typeof getSupabaseAdmin>);
  });

  it("fetches token history once even when the result reaches the limit", async () => {
    const history = Array.from({ length: 1000 }, (_, id) => ({ id }));
    // The history query is identifiable by its account-id filter.
    const from = vi.mocked(getSupabaseAdmin().from);
    const createQuery = from.getMockImplementation()!;
    from.mockImplementation((...args) => {
      const query = createQuery(...args) as unknown as Record<string, ReturnType<typeof vi.fn>>;
      query.then.mockImplementation((resolve) => resolve({
        data: query.not.mock.calls.length ? history : [], error: null, count: 0
      }));
      return query as never;
    });

    const overview = await getAdminOverview();
    const historyQueries = queries.filter((query) => query.not.mock.calls.length);
    expect(historyQueries).toHaveLength(1);
    expect(historyQueries[0].limit).toHaveBeenCalledWith(1000);
    expect(overview.accountTokenEvents).toHaveLength(1000);
    expect(from).toHaveBeenCalledTimes(10);
  });

  it("propagates history query errors instead of silently hiding them", async () => {
    const from = vi.mocked(getSupabaseAdmin().from);
    const createQuery = from.getMockImplementation()!;
    from.mockImplementation((...args) => {
      const query = createQuery(...args) as unknown as Record<string, ReturnType<typeof vi.fn>>;
      query.then.mockImplementation((resolve) => resolve({
        data: [], error: query.not.mock.calls.length ? new Error("database unavailable") : null
      }));
      return query as never;
    });
    await expect(getAdminOverview()).rejects.toThrow("database unavailable");
  });
});
