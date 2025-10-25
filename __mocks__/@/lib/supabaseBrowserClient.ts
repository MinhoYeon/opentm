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
});
