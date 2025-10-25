import { jest } from '@jest/globals';

const subscription = { unsubscribe: jest.fn() };

const supabaseClientMock = {
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
};

supabaseClientMock.auth.onAuthStateChange.mockImplementation(() => ({
  data: { subscription },
}));

export const createBrowserClient = jest.fn(() => supabaseClientMock);

export function __resetSupabaseBrowserClientMocks() {
  supabaseClientMock.auth.getSession.mockReset();
  supabaseClientMock.auth.getUser.mockReset();
  supabaseClientMock.auth.onAuthStateChange.mockReset();
  supabaseClientMock.auth.signInWithPassword.mockReset();
  supabaseClientMock.auth.signOut.mockReset();
  subscription.unsubscribe.mockReset();

  supabaseClientMock.auth.onAuthStateChange.mockImplementation(() => ({
    data: { subscription },
  }));
}

export type SupabaseBrowserClientMock = typeof supabaseClientMock;
export const supabaseBrowserClientMock = supabaseClientMock;
