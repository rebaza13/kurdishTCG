"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { errorMessage, getSupabase } from "@/lib/supabase";

type AuthState =
  | { status: "loading" }
  | { status: "signed-out"; notice?: string }
  | { status: "admin"; email: string; userId: string };

interface AuthContextValue {
  state: AuthState;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Resolve a session into an auth state, checking `profiles.role`. */
async function resolveSession(session: Session | null): Promise<AuthState> {
  if (!session) return { status: "signed-out" };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();

  // `scope: "local"` only clears this browser's admin session. The default
  // ("global") revokes every session of the account — refusing a customer
  // here would also sign them out of the storefront on all their devices.
  if (error) {
    await supabase.auth.signOut({ scope: "local" });
    return { status: "signed-out", notice: errorMessage(error) };
  }
  if (data?.role !== "admin") {
    // A customer account must not linger in the admin origin.
    await supabase.auth.signOut({ scope: "local" });
    return {
      status: "signed-out",
      notice: "This account doesn't have admin access.",
    };
  }
  return {
    status: "admin",
    email: session.user.email ?? "",
    userId: session.user.id,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });
  // signIn() resolves its own session; the SIGNED_IN event it triggers must
  // not run a second, racing resolveSession (double profile read + signOut).
  const signingIn = useRef(false);

  useEffect(() => {
    const supabase = getSupabase();
    let cancelled = false;

    supabase.auth
      .getSession()
      .then(({ data }) => resolveSession(data.session))
      .then(
        (next) => {
          if (!cancelled) setState(next);
        },
        // e.g. offline — don't leave the app stuck on "Checking your session…".
        (err) => {
          if (!cancelled) setState({ status: "signed-out", notice: errorMessage(err) });
        }
      );

    // Never await Supabase calls inside this callback (it holds the auth
    // lock) — only react to sign-out, and to a sign-in from another tab.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setState((prev) =>
          prev.status === "signed-out" ? prev : { status: "signed-out" }
        );
      } else if (event === "SIGNED_IN" && !signingIn.current) {
        setTimeout(() => {
          resolveSession(session).then((next) => {
            if (!cancelled) setState(next);
          });
        }, 0);
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    signingIn.current = true;
    let next: AuthState;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return error.message;
      next = await resolveSession(data.session);
    } catch (err) {
      return errorMessage(err);
    } finally {
      signingIn.current = false;
    }
    setState(next);
    return next.status === "admin"
      ? null
      : next.status === "signed-out"
        ? (next.notice ?? "Sign-in failed.")
        : "Sign-in failed.";
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut({ scope: "local" });
    setState({ status: "signed-out" });
  }, []);

  const value = useMemo(
    () => ({ state, signIn, signOut }),
    [state, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
