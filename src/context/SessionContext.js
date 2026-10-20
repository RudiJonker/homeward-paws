import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';

import { supabase } from '../services/supabase';

const SessionContext = createContext(null);

async function applyAuthUrl(url) {
  if (!supabase || !url) return;
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return;
  }

  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  const refreshToken = hash.get('refresh_token');
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
}

export function SessionProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [privateProfile, setPrivateProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  const refreshProfile = useCallback(async (userId = session?.user?.id) => {
    if (!supabase || !userId) {
      setProfile(null);
      setPrivateProfile(null);
      return;
    }

    const [{ data: profileData, error: profileError }, { data: privateData, error: privateError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('profile_private').select('*').eq('user_id', userId).single()
    ]);
    if (profileError) throw profileError;
    if (privateError) throw privateError;
    setProfile(profileData);
    setPrivateProfile(privateData);
  }, [session?.user?.id]);

  useEffect(() => {
    let mounted = true;
    if (!supabase) {
      return undefined;
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        try { await refreshProfile(data.session.user.id); } catch { /* handled by screens */ }
      }
      if (mounted) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setPrivateProfile(null);
      } else {
        setTimeout(() => refreshProfile(nextSession.user.id).catch(() => {}), 0);
      }
    });

    Linking.getInitialURL().then(applyAuthUrl);
    const linkSubscription = Linking.addEventListener('url', ({ url }) => applyAuthUrl(url));

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [refreshProfile]);

  const value = useMemo(() => ({ session, profile, privateProfile, loading, refreshProfile }), [session, profile, privateProfile, loading, refreshProfile]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
