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
import type { AuthResponse, Session, User } from "@supabase/supabase-js";

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
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      try {
        const { data: userData } = await supabase.auth.getUser();
        setUser(userData.user ?? null);
      } catch (error) {
        console.error("Failed to refresh Supabase user", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const login = useCallback(
    async ({ email, password }: LoginCredentials) => {
      const response = await supabase.auth.signInWithPassword({ email, password });

      if (response.error) {
        throw response.error;
      }

      if (response.data.session) {
        setSession(response.data.session);
        try {
          const { data: userData } = await supabase.auth.getUser();
          setUser(userData.user ?? null);
        } catch {}
      }

      return response;
    },
    [supabase]
  );

  const logout = useCallback(async () => {
    // Best-effort: clear client session, then server cookie. Ignore "Auth session missing".
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

    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch (err) {
      console.warn("Server signout failed", err);
    }

    setSession(null);
    setUser(null);
    setIsLoading(false);
    // Perform a hard navigation to avoid RSC race conditions
    if (typeof window !== "undefined") {
      window.location.replace("/login");
      return;
    }
    router.replace("/login");
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
