import { beforeEach, describe, expect, it, jest } from "@jest/globals";

import AdminTrademarksPage from "@/app/admin/trademarks/page";
import type { AdminActivityLog, AdminTrademarkApplication, StatusSummary } from "@/app/admin/trademarks/types";
import { ApiError } from "@/lib/api/errors";
import { getAdminCapabilities } from "@/lib/admin/roles";
import { requireAdminContext } from "@/lib/api/auth";
import { createServerClient } from "@/lib/supabaseServerClient";

type DashboardRenderProps = {
  initialApplications: AdminTrademarkApplication[];
  initialStatusSummary: StatusSummary[];
  recentActivity: AdminActivityLog[];
  initialFilters: { statuses: string[] };
  savedFilters: unknown;
  statusOptions: Array<{ value: string; label: string }>;
  admin: { id: string };
  initialPagination: { page: number; pageSize: number; totalCount: number };
};

const renderSpy = jest.fn((props: DashboardRenderProps) => props);

jest.mock("@/app/admin/trademarks/AdminTrademarkDashboardClient", () => ({
  __esModule: true,
  default: jest.fn((props: DashboardRenderProps) => renderSpy(props)),
}));

jest.mock("@/lib/api/auth");
jest.mock("@/lib/supabaseServerClient");

const requireAdminContextMock = requireAdminContext as jest.MockedFunction<typeof requireAdminContext>;
const createServerClientMock = createServerClient as jest.MockedFunction<typeof createServerClient>;

function resolvedQuery<T>(payload: T) {
  const executor = () => Promise.resolve(payload);
  const chain = {
    select: jest.fn(() => chain),
    order: jest.fn(() => chain),
    range: jest.fn(() => chain),
    in: jest.fn(() => chain),
    or: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    group: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: (resolve: (value: T) => void, reject: (reason: unknown) => void) => executor().then(resolve, reject),
  } as const;
  return chain;
}

function rejectedQuery(error: unknown) {
  const executor = () => Promise.reject(error);
  const chain = {
    select: jest.fn(() => chain),
    order: jest.fn(() => chain),
    range: jest.fn(() => chain),
    in: jest.fn(() => chain),
    or: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    group: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    then: (resolve: (value: never) => void, reject: (reason: unknown) => void) => executor().then(resolve, reject),
  } as const;
  return chain;
}

type QueryChain = ReturnType<typeof resolvedQuery>;

type TableQueryMap = Record<string, QueryChain[]>;

let tableQueries: TableQueryMap;
let supabaseFromMock: jest.Mock<QueryChain, [string]>;

function primeTable(table: string, queries: QueryChain[]) {
  tableQueries[table] = queries.slice();
}

beforeEach(() => {
  renderSpy.mockClear();
  tableQueries = {};
  supabaseFromMock = jest.fn((table: string) => {
    const queue = tableQueries[table];
    if (!queue || queue.length === 0) {
      throw new Error(`Unexpected query for table: ${table}`);
    }
    return queue.shift()!;
  });

  createServerClientMock.mockReset();
  createServerClientMock.mockReturnValue({ from: supabaseFromMock } as unknown as ReturnType<typeof createServerClient>);
  requireAdminContextMock.mockReset();
});

describe("AdminTrademarksPage integration", () => {
  it("propagates a 403 when the admin context requirement fails", async () => {
    const error = new ApiError("관리자 권한이 필요합니다.", { status: 403 });
    requireAdminContextMock.mockRejectedValueOnce(error);

    await expect(AdminTrademarksPage({})).rejects.toThrow(error);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("loads applications, status summary, and activity logs for admin sessions", async () => {
    const capabilities = getAdminCapabilities("operations_admin");
    requireAdminContextMock.mockResolvedValue({
      context: { role: "operations_admin", capabilities },
      session: {
        access_token: "token",
        user: {
          id: "admin-1",
          email: "admin@example.com",
          user_metadata: { name: "Admin" },
        },
      },
      adminSession: {
        id: "session-1",
        user_id: "admin-1",
        session_hash: "hash",
        is_revoked: false,
        mfa_verified_at: "2024-01-01T00:00:00.000Z",
        last_seen_at: "2024-01-02T00:00:00.000Z",
      },
    });

    primeTable("trademark_applications", [
      resolvedQuery({
        data: [
          { id: "app-1", brand_name: "Alpha", status: "draft", created_at: "2024-01-01T00:00:00Z" },
          { id: "app-2", brand_name: "Beta", status: "filed", created_at: "2024-01-02T00:00:00Z" },
        ],
        count: 2,
        error: null,
      }),
      resolvedQuery({
        data: [
          { status: "draft", count: 1 },
          { status: "filed", count: 1 },
        ],
        error: null,
      }),
    ]);

    primeTable("admin_activity_logs", [
      resolvedQuery({
        data: [
          {
            id: 1,
            action_type: "update_status",
            target_type: "trademark",
            target_id: "app-1",
            summary: "Status updated",
            created_at: "2024-03-01T00:00:00Z",
            metadata: null,
          },
        ],
        error: null,
      }),
    ]);

    await AdminTrademarksPage({ searchParams: { statuses: "draft,filed" } });

    expect(requireAdminContextMock).toHaveBeenCalledTimes(1);
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(supabaseFromMock).toHaveBeenCalledWith("trademark_applications");
    expect(supabaseFromMock).toHaveBeenCalledWith("admin_activity_logs");

    expect(renderSpy).toHaveBeenCalledTimes(1);
    const props = renderSpy.mock.calls[0][0];

    expect(props.initialFilters.statuses).toEqual(["draft", "filed"]);
    expect(props.initialApplications.map((app) => app.id)).toEqual(["app-1", "app-2"]);
    expect(props.initialPagination).toEqual({ page: 1, pageSize: 25, totalCount: 2 });
    expect(props.initialStatusSummary).toEqual([
      { status: "draft", count: 1 },
      { status: "filed", count: 1 },
    ]);
    expect(props.recentActivity).toEqual([
      {
        id: "1",
        actionType: "update_status",
        targetType: "trademark",
        targetId: "app-1",
        summary: "Status updated",
        createdAt: "2024-03-01T00:00:00Z",
        actorId: null,
        actorName: null,
        metadata: null,
      },
    ]);
  });

  it("falls back to calculating status counts locally when the grouped query fails", async () => {
    const capabilities = getAdminCapabilities("operations_admin");
    requireAdminContextMock.mockResolvedValue({
      context: { role: "operations_admin", capabilities },
      session: {
        access_token: "token",
        user: {
          id: "admin-2",
          email: "ops@example.com",
          user_metadata: { name: "Operator" },
        },
      },
      adminSession: {
        id: "session-2",
        user_id: "admin-2",
        session_hash: "hash-2",
        is_revoked: false,
        mfa_verified_at: "2024-01-10T00:00:00.000Z",
        last_seen_at: "2024-01-11T00:00:00.000Z",
      },
    });

    primeTable("trademark_applications", [
      resolvedQuery({
        data: [
          { id: "app-10", brand_name: "Gamma", status: "draft", created_at: "2024-02-01T00:00:00Z" },
          { id: "app-11", brand_name: "Delta", status: "filed", created_at: "2024-02-02T00:00:00Z" },
          { id: "app-12", brand_name: "Epsilon", status: "filed", created_at: "2024-02-03T00:00:00Z" },
        ],
        count: 3,
        error: null,
      }),
      rejectedQuery(new Error("aggregation failed")),
    ]);

    primeTable("admin_activity_logs", [
      resolvedQuery({ data: [], error: null }),
    ]);

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);

    await AdminTrademarksPage({});

    warnSpy.mockRestore();

    expect(renderSpy).toHaveBeenCalledTimes(1);
    const props = renderSpy.mock.calls[0][0];
    expect(props.initialStatusSummary).toEqual([
      { status: "draft", count: 1 },
      { status: "filed", count: 2 },
    ]);
  });
});
