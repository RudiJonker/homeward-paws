import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { links } from '../../config/links';
import { useSession } from '../../context/SessionContext';
import { supabase } from '../../services/supabase';
import { authEmailError } from '../../utils/authEmail';
import { authStyles as styles } from './authStyles';

export function AuthCallbackScreen({ navigation, route }) {
  const tokenHash = route.params?.token_hash;
  const type = route.params?.type;
  const validLink = Boolean(tokenHash && ['email', 'recovery'].includes(type));
  const lastAttempt = useRef(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState(validLink ? 'working' : 'error');
  const [message, setMessage] = useState(validLink ? '' : 'This link is incomplete. Open the latest email or request a new one.');
  const [verifiedUserId, setVerifiedUserId] = useState(null);
  const [exitTarget, setExitTarget] = useState(null);
  const {
    session, profile, pendingEmail, recoveryFlow, setRecoveryEmail, setRecoveryFlow,
    setPendingEmail, refreshProfile
  } = useSession();

  useEffect(() => {
    if (!validLink) return;
    const attemptKey = `${tokenHash}:${type}:${attempt}`;
    if (lastAttempt.current === attemptKey) return;
    lastAttempt.current = attemptKey;
    let active = true;

    async function verifyLink() {
      try {
        const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (!active) return;
        if (error) throw error;
        if (!data.session || !data.user) throw new Error('Invalid token');
        if (type === 'recovery') {
          setRecoveryEmail(data.user.email || null);
          setRecoveryFlow(true);
          setStatus('recovery');
          return;
        }
        await setPendingEmail(null);
        setVerifiedUserId(data.user.id);
        try {
          await refreshProfile(data.user.id);
          if (active) setStatus('confirmed');
        } catch {
          if (active) {
            setStatus('profile-error');
            setMessage('Your email is confirmed, but your profile could not be loaded. Please try again.');
          }
        }
      } catch (error) {
        if (!active) return;
        setStatus('error');
        setMessage(authEmailError(error));
      }
    }
    verifyLink();
    return () => { active = false; };
  }, [tokenHash, type, validLink, attempt, refreshProfile, setPendingEmail, setRecoveryEmail, setRecoveryFlow]);

  useEffect(() => {
    if (status === 'recovery' && recoveryFlow) navigation.replace('ResetPassword');
    if (status !== 'confirmed' || !session || !profile || session.user.id !== verifiedUserId) return;
    const destination = profile.account_status === 'suspended'
      ? 'Suspended'
      : profile.profile_completed ? 'Member' : 'ProfileSetup';
    navigation.reset({ index: 0, routes: [{ name: destination }] });
  }, [status, recoveryFlow, session, profile, verifiedUserId, navigation]);

  useEffect(() => {
    if (exitTarget && !session) {
      navigation.reset({ index: 0, routes: [{ name: 'Public', params: { screen: exitTarget } }] });
    }
  }, [exitTarget, session, navigation]);

  async function requestNewEmail() {
    setExitTarget(type === 'recovery' ? 'ForgotPassword' : pendingEmail ? 'EmailVerification' : 'SignUp');
    if (session) await supabase.auth.signOut();
  }

  function returnToApp() {
    if (navigation.canGoBack()) return navigation.goBack();
    const destination = !session ? 'Public' : profile?.account_status === 'suspended'
      ? 'Suspended' : profile?.profile_completed ? 'Member' : 'ProfileSetup';
    navigation.reset({ index: 0, routes: [{ name: destination }] });
  }

  async function retryProfile() {
    try {
      await refreshProfile(verifiedUserId);
      setStatus('confirmed');
    } catch {
      setMessage('Your email is confirmed, but your profile could not be loaded. Please try again.');
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>{type === 'recovery' ? 'Resetting password' : 'Confirming email'}</Text>
      <View style={styles.form}>
        {status === 'working' || status === 'recovery' || status === 'confirmed' ? (
          <Text style={styles.subtitle}>{status === 'working' ? 'Checking the link…' : 'Preparing your account…'}</Text>
        ) : null}
        {status === 'error' ? (
          <>
            <Text style={styles.error}>{message}</Text>
            {validLink ? (
              <>
                <PrimaryButton label="Send a new email" onPress={requestNewEmail} />
                <Pressable onPress={() => { setStatus('working'); setMessage(''); setAttempt((value) => value + 1); }}><Text style={styles.link}>Try again</Text></Pressable>
              </>
            ) : <PrimaryButton label="Return to app" onPress={returnToApp} />}
            <Pressable onPress={() => Linking.openURL(links.help)}><Text style={styles.link}>Help</Text></Pressable>
          </>
        ) : null}
        {status === 'profile-error' ? <><Text style={styles.error}>{message}</Text><PrimaryButton label="Try again" onPress={retryProfile} /></> : null}
      </View>
    </ScreenContainer>
  );
}
