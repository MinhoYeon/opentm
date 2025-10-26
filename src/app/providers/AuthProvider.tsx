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
      setSession(nextSession);

      try {
        await syncSessionWithServer(event, nextSession);
      } catch (error) {
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
        setUser(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError && userError.status !== 400) {
          console.error("Failed to refresh Supabase user", userError);
        }
        setUser(userData?.user ?? null);
      } catch (error) {
        console.error("Failed to refresh Supabase user", error);
        setUser(null);
      } finally {
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
      const response = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (response.error) {
        throw response.error;
      }

      if (response.data.session) {
        setSession(response.data.session);
        try {
          const { data: userData } = await supabase.auth.getUser();
          setUser(userData.user ?? null);
        } catch {}

        try {
          await syncSessionWithServer("SIGNED_IN", response.data.session);
        } catch (error) {
          console.error("Failed to sync session after login", error);
        }
      }

      return response;
    },
    [supabase, syncSessionWithServer]
  );

  const logout = useCallback(async () => {
    // Best-effort: clear client session, then server cookie. Ignore "Auth session missing".
    setSession(null);
    setUser(null);
    setIsLoading(false);

    try {
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
