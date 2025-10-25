// __mocks__/@/lib/supabaseBrowserClient.ts
export const createBrowserClient = () => ({
  auth: {
    getSession: jest.fn(),
    getUser: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
  },
});
