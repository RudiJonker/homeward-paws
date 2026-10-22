import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { supabase } from '../services/supabase';

const SessionContext = createContext(null);
const PENDING_EMAIL_KEY = 'homeward-paws:pending-email';

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [privateProfile, setPrivateProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [pendingEmail, setPendingEmailState] = useState(null);
  const [recoveryEmail, setRecoveryEmail] = useState(null);
  const [recoveryFlow, setRecoveryFlow] = useState(false);

  const setPendingEmail = useCallback(async (email) => {
    const normalized = email?.trim().toLowerCase() || null;
    setPendingEmailState(normalized);
    try {
      if (normalized) await AsyncStorage.setItem(PENDING_EMAIL_KEY, normalized);
      else await AsyncStorage.removeItem(PENDING_EMAIL_KEY);
    } catch { /* Keep the current flow usable even if local storage fails. */ }
  }, []);

  const refreshProfile = useCallback(async (userId) => {
    const targetUserId = userId || (await supabase?.auth.getSession())?.data?.session?.user?.id;
    if (!supabase || !targetUserId) {
      setProfile(null);
      setPrivateProfile(null);
      return;
    }

    const [{ data: profileData, error: profileError }, { data: privateData, error: privateError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', targetUserId).single(),
      supabase.from('profile_private').select('*').eq('user_id', targetUserId).single()
    ]);
    if (profileError) throw profileError;
    if (privateError) throw privateError;
    setProfile(profileData);
    setPrivateProfile(privateData);
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      return undefined;
    }

    Promise.all([supabase.auth.getSession(), AsyncStorage.getItem(PENDING_EMAIL_KEY)]).then(async ([{ data }, savedEmail]) => {
      if (!mounted) return;
      setSession(data.session);
      setPendingEmailState(data.session ? null : savedEmail);
      if (data.session && savedEmail) setPendingEmail(null).catch(() => {});
      if (data.session) {
        try { await refreshProfile(data.session.user.id); } catch { /* handled by screens */ }
      }
      if (mounted) setLoading(false);
    }).catch(() => { if (mounted) setLoading(false); });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setPrivateProfile(null);
        setRecoveryFlow(false);
        setRecoveryEmail(null);
        if (event === 'SIGNED_OUT') setPendingEmail(null).catch(() => {});
      } else {
        setTimeout(() => refreshProfile(nextSession.user.id).catch(() => {}), 0);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [refreshProfile, setPendingEmail]);

  const value = useMemo(() => ({
    session, profile, privateProfile, loading, refreshProfile, pendingEmail, setPendingEmail,
    recoveryEmail, setRecoveryEmail, recoveryFlow, setRecoveryFlow
  }), [session, profile, privateProfile, loading, refreshProfile, pendingEmail, setPendingEmail, recoveryEmail, recoveryFlow]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
