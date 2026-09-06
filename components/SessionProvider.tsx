"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "@/i18n/navigation";
import { getSupabase, supabaseConfigured } from "@/lib/supabase/client";
import { setAccessTokenProvider } from "@/lib/api";
import type { Company, Profile } from "@/lib/types";

export interface SessionValue {
  user: User;
  profile: Profile;
  companyId: string;
  company: Company | null;
  isOwner: boolean;
  refreshCompany: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside SessionProvider");
  return value;
}

export type GuardState =
  | { kind: "loading" }
  | {
      kind: "no-company";
      email: string;
      signOut: () => Promise<void>;
      /** Re-reads the profile after onboarding attaches a company to it. */
      refresh: () => void;
    }
  | { kind: "unconfigured" }
  | { kind: "ready"; value: SessionValue };

/**
 * Resolves the signed-in user, their profile row and their company, and hands
 * the result to the app shell. Anyone without a session is bounced to sign in;
 * a user whose profile has no company gets a dedicated screen rather than an
 * empty dashboard they cannot fill.
 */
export function useGuardedSession(): GuardState {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [resolved, setResolved] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const loadProfile = useCallback(async (userId: string) => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("profiles")
      .select("id, company_id, full_name, role, created_at")
      .eq("id", userId)
      .maybeSingle();
    return (data as Profile | null) ?? null;
  }, []);

  const loadCompany = useCallback(async (companyId: string) => {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("companies")
      .select("id, name, tariff, hours_limit, hours_used, created_at")
      .eq("id", companyId)
      .maybeSingle();
    return (data as Company | null) ?? null;
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) {
      setResolved(true);
      return;
    }

    const supabase = getSupabase();
    let cancelled = false;

    // Registered up front so flipping NEXT_PUBLIC_API_AUTH is all that is left
    // to do when the Railway API starts verifying JWTs.
    setAccessTokenProvider(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });

    async function hydrate(next: Session | null) {
      if (cancelled) return;
      setSession(next);
      if (!next) {
        setProfile(null);
        setCompany(null);
        setResolved(true);
        router.replace("/kirish");
        return;
      }
      const nextProfile = await loadProfile(next.user.id);
      if (cancelled) return;
      setProfile(nextProfile);
      if (nextProfile?.company_id) {
        const nextCompany = await loadCompany(nextProfile.company_id);
        if (cancelled) return;
        setCompany(nextCompany);
      } else {
        setCompany(null);
      }
      setResolved(true);
    }

    void supabase.auth.getSession().then(({ data }) => hydrate(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setSession(next);
        return;
      }
      void hydrate(next);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadCompany, loadProfile, router, reloadKey]);

  const refreshCompany = useCallback(async () => {
    if (!profile?.company_id) return;
    setCompany(await loadCompany(profile.company_id));
  }, [loadCompany, profile?.company_id]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  const signOut = useCallback(async () => {
    if (supabaseConfigured) await getSupabase().auth.signOut();
    router.replace("/kirish");
  }, [router]);

  const value = useMemo<SessionValue | null>(() => {
    if (!session || !profile?.company_id) return null;
    return {
      user: session.user,
      profile,
      companyId: profile.company_id,
      company,
      isOwner: profile.role === "owner",
      refreshCompany,
      signOut,
    };
  }, [company, profile, refreshCompany, session, signOut]);

  if (!supabaseConfigured) return { kind: "unconfigured" };
  if (!resolved || (session && !profile && !resolved)) return { kind: "loading" };
  if (!session) return { kind: "loading" };
  if (!value) {
    return { kind: "no-company", email: session.user.email ?? "", signOut, refresh };
  }
  return { kind: "ready", value };
}

export function SessionProvider({
  value,
  children,
}: {
  value: SessionValue;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
