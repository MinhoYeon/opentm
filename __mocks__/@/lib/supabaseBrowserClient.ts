import { jest } from '@jest/globals';

type Subscription = {
  unsubscribe: jest.Mock;
};

type SupabaseClientMock = {
  auth: {
    getSession: jest.Mock;
    getUser: jest.Mock;
    onAuthStateChange: jest.Mock;
    signInWithPassword: jest.Mock;
    signOut: jest.Mock;
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
