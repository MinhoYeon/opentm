import { jest } from '@jest/globals';

const signOutMock = jest.fn(async () => ({ error: null }));

const supabaseServerClientMock = {
  auth: {
    signOut: signOutMock,
  },
};

export const createServerClient = jest.fn(() => supabaseServerClientMock);

export function __resetSupabaseServerClientMocks() {
  signOutMock.mockReset();
  signOutMock.mockResolvedValue({ error: null });
  createServerClient.mockReset();
  createServerClient.mockImplementation(() => supabaseServerClientMock);
}

export { supabaseServerClientMock };
