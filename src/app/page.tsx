"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Dashboard } from "@/components/Dashboard";
import { LoginPage } from "@/components/LoginPage";
import { getSupabase } from "@/lib/supabase";
import { withSupabaseTimeout } from "@/lib/supabase-timeout";
import { LoadingState } from "@/components/tasks/states";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    withSupabaseTimeout(supabase.auth.getSession(), "读取登录状态")
      .then(({ data, error }) => {
        if (error) throw error;
        if (active) setSession(data.session);
      })
      .catch((error) => console.error("Load auth session failed", error))
      .finally(() => {
        if (active) setReady(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (!ready) return <LoadingState />;
  if (!session) return <LoginPage />;
  return <Dashboard session={session} />;
}
