"use client";

import { useRouter } from "next/navigation";
import {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
  type ReactNode,
} from "react";
import type {
  AuthChangeEvent,
  AuthResponse,
  Session,
  User,
} from "@supabase/supabase-js";

// import { createBrowserClient } from "@/lib/supabaseClient";
import { createBrowserClient } from "@/lib/supabaseBrowserClient";


type LoginCredentials = {
  email: string;
  password: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<AuthResponse>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthProviderProps = {
  children: ReactNode;
  initialSession?: Session | null;
};

export function AuthProvider({ children, initialSession = null }: AuthProviderProps) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(initialSession);
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [isLoading, setIsLoading] = useState(initialSession ? false : true);

  const supabase = useMemo(() => createBrowserClient(), []);

  const syncSessionWithServer = useCallback(
    async (event: AuthChangeEvent, nextSession: Session | null) => {
      try {
        const response = await fetch("/api/auth/session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          cache: "no-store",
          body: JSON.stringify({ event, session: nextSession }),
        });

        if (!response.ok) {
          throw new Error(`Failed to sync session: ${response.status}`);
        }
      } catch (error) {
        console.error("Failed to sync auth session with server", error);
        throw error;
      }
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [{ data: sessionData }, { data: userData }] = await Promise.all([
          supabase.auth.getSession(),
          supabase.auth.getUser(),
        ]);
        if (!isMounted) return;
        setSession(sessionData.session ?? null);
        setUser(userData.user ?? null);
      } catch (error) {
        console.error("Failed to initialize Supabase auth", error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      console.log("[AuthProvider] Auth state change:", event, "Session:", !!nextSession);
      setSession(nextSession);

      try {
        await syncSessionWithServer(event, nextSession);
        console.log("[AuthProvider] Session synced for event:", event);
      } catch (error) {
        console.error("[AuthProvider] Failed to sync session for event:", event, error);
        if (event === "SIGNED_OUT") {
          try {
            await fetch("/api/auth/signout", {
              method: "POST",
              credentials: "same-origin",
              cache: "no-store",
            });
          } catch (fallbackError) {
            console.warn("Server signout fallback failed", fallbackError);
          }
        }
      }

      if (event === "SIGNED_OUT" || !nextSession) {
        console.log("[AuthProvider] Clearing user state");
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError && userError.status !== 400) {
          console.error("[AuthProvider] Failed to refresh Supabase user", userError);
        }
        console.log("[AuthProvider] User refreshed:", !!userData?.user);
        setUser(userData?.user ?? null);
      } catch (error) {
        console.error("[AuthProvider] Failed to refresh Supabase user", error);
        setUser(null);
      } finally {
        console.log("[AuthProvider] Setting isLoading to false");
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, syncSessionWithServer]);

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      console.log("[AuthProvider] Starting login...");
      // Attempt to authenticate the user with the provided credentials using Supabase.
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
        console.error("[AuthProvider] Login failed:", response.error);
        // Propagate the error so that the caller can handle the failure state.
        throw response.error;
      }

      console.log("[AuthProvider] Login successful, session received");

      if (response.data.session && response.data.user) {
        // Persist the new session and user to local state when authentication succeeds.
        // Use the user from the response directly instead of calling getUser again
        setSession(response.data.session);
        setUser(response.data.user);
        console.log("[AuthProvider] Session and user state updated");

        try {
          // Inform the server about the new session so HTTP-only cookies stay in sync.
          await syncSessionWithServer("SIGNED_IN", response.data.session);
          console.log("[AuthProvider] Session synced with server");
        } catch (error) {
          console.error("[AuthProvider] Failed to sync session after login", error);
          // Don't throw here - auth state is already set, cookie sync is secondary
        }
      }

      return response;
    },
    [supabase, syncSessionWithServer]
  );

  const logout = useCallback(async () => {
    // Immediately clear the local auth state so the UI reflects the logged-out status.
    setSession(null);
    setUser(null);
    setIsLoading(false);

    try {
      // Ask Supabase to invalidate the session; ignore benign "missing session" errors.
      const { error } = await supabase.auth.signOut();
      const lowerMessage = error?.message?.toLowerCase?.() ?? "";
      if (error && !lowerMessage.includes("auth session missing")) {
        // Non-benign error: still continue but log for debugging
        console.warn("supabase.auth.signOut returned error", error);
      }
    } catch (err) {
      // Ignore; proceed to clear server cookie
      console.warn("Client signOut threw", err);
    }

    // Route the user back to the login page and trigger a refresh to ensure stale data is cleared.
    router.replace("/login");
    router.refresh();
  }, [router, supabase]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user),
      isLoading,
      session,
      user,
      login,
      logout,
    }),
    [user, session, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
