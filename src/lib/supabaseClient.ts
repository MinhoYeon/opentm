import { createBrowserClient } from "./supabaseBrowserClient";
type CreateServerClient = typeof import("./supabaseServerClient").createServerClient;

type CreateServerClientArgs = Parameters<CreateServerClient>;
type CreateServerClientReturn = ReturnType<CreateServerClient>;

export { createBrowserClient };

export function createServerClient(
  ..._args: CreateServerClientArgs
): CreateServerClientReturn {
  void _args;
  throw new Error(
    "createServerClient has moved to '@/lib/supabaseServerClient'. Import it from there to keep server-only code out of client bundles."
  );
}
