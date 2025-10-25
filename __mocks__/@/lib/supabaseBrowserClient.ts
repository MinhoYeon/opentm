type MockFn = ((...args: unknown[]) => unknown) & {
  mockClear: () => MockFn;
  mockImplementation: (implementation: (...args: unknown[]) => unknown) => MockFn;
  mockRejectedValue: (reason?: unknown) => MockFn;
  mockResolvedValue: (value: unknown) => MockFn;
  mockReset: () => MockFn;
  mockReturnValue: (value: unknown) => MockFn;
};

type JestLike = {
  fn: <Args extends unknown[], Return>(
    implementation?: (...args: Args) => Return
  ) => MockFn & ((...args: Args) => Return);
};

declare const jest: JestLike;

type Subscription = {
  unsubscribe: MockFn;
};

type SupabaseClientMock = {
  auth: {
    getSession: MockFn;
    getUser: MockFn;
    onAuthStateChange: MockFn;
    signInWithPassword: MockFn;
    signOut: MockFn;
  };
};

const subscription: Subscription = {
  unsubscribe: jest.fn(),
};

const supabaseClientMock: SupabaseClientMock = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
};

function applyDefaultAuthSubscription() {
  supabaseClientMock.auth.onAuthStateChange.mockImplementation(() => ({
    data: { subscription },
  }));
}

applyDefaultAuthSubscription();

export const createBrowserClient = jest.fn(() => supabaseClientMock);

export function __resetSupabaseBrowserClientMocks() {
  supabaseClientMock.auth.getSession.mockReset();
  supabaseClientMock.auth.getUser.mockReset();
  supabaseClientMock.auth.onAuthStateChange.mockReset();
  supabaseClientMock.auth.signInWithPassword.mockReset();
  supabaseClientMock.auth.signOut.mockReset();
  subscription.unsubscribe.mockReset();

  applyDefaultAuthSubscription();
}

export type { SupabaseClientMock as SupabaseBrowserClientMock };
export const supabaseBrowserClientMock = supabaseClientMock;
export const supabaseAuthSubscriptionMock = subscription;
