import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider';
import {
  createBrowserClient,
  supabaseBrowserClientMock,
  __resetSupabaseBrowserClientMocks,
} from '@/lib/supabaseBrowserClient';

jest.mock('@/lib/supabaseBrowserClient');

function TestConsumer() {
  const { isLoading, user } = useAuth();
  return (
    <>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
    </>
  );
}

const describeIfDom =
  typeof globalThis.document === 'undefined' ? describe.skip : describe;

describeIfDom('AuthProvider', () => {
  const createBrowserClientMock =
    createBrowserClient as jest.MockedFunction<typeof createBrowserClient>;
  const supabaseMock =
    supabaseBrowserClientMock as jest.Mocked<typeof supabaseBrowserClientMock>;

  beforeEach(() => {
    __resetSupabaseBrowserClientMocks();
    jest.clearAllMocks();
    createBrowserClientMock.mockReturnValue(supabaseMock);
  });

  it('초기 세션 로딩 이후 사용자 상태를 노출한다', async () => {
    supabaseMock.auth.getSession.mockResolvedValue({
      data: { session: { user: { email: 'user@example.com' } } },
    } as any);
    supabaseMock.auth.getUser.mockResolvedValue({
      data: { user: { email: 'user@example.com' } },
    } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('user')).toHaveTextContent('user@example.com');
  });

  it('세션 조회가 실패하면 에러 로깅 후 로딩을 종료한다', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    supabaseMock.auth.getSession.mockRejectedValue(new Error('boom'));
    supabaseMock.auth.getUser.mockResolvedValue({ data: { user: null } } as any);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to initialize Supabase auth',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
