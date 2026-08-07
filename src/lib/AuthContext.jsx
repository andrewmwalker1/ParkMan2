import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "./supabaseClient.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not checked yet, null = signed out
  const [profile, setProfile] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deactivated, setDeactivated] = useState(false);
  const loadedUserIdRef = useRef(null);

  const loadProfileAndBusiness = useCallback(async (userId) => {
    setDeactivated(false);
    const { data: profileRow, error: profileError } = await supabase
      .from("profiles")
      .select("id, business_id, display_name, is_active")
      .eq("id", userId)
      .single();
    if (profileError) {
      console.error("Failed to load profile", profileError);
      setLoading(false);
      return;
    }

    if (profileRow.is_active === false) {
      setDeactivated(true);
      setLoading(false);
      await supabase.auth.signOut();
      return;
    }

    setProfile(profileRow);
    loadedUserIdRef.current = userId;

    const { data: businessRow, error: businessError } = await supabase
      .from("business")
      .select("id, name")
      .eq("id", profileRow.business_id)
      .single();
    if (businessError) console.error("Failed to load business", businessError);
    setBusiness(businessRow || null);

    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfileAndBusiness(data.session.user.id);
      else setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      if (event === "SIGNED_IN") {
        // supabase-js re-fires SIGNED_IN on tab focus, not just on an
        // actual new sign-in (see Maintenance's AuthContext for the same
        // note) -- only reload if the signed-in user actually changed.
        if (loadedUserIdRef.current !== newSession.user.id) {
          setLoading(true);
          loadProfileAndBusiness(newSession.user.id);
        }
      } else if (event === "SIGNED_OUT") {
        loadedUserIdRef.current = null;
        setProfile(null);
        setBusiness(null);
        setLoading(false);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [loadProfileAndBusiness]);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const value = { session, profile, business, loading, deactivated, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
