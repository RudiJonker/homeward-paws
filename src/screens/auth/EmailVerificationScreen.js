import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useSession } from '../../context/SessionContext';
import { useEmailCooldown } from '../../hooks/useEmailCooldown';
import { supabase } from '../../services/supabase';
import { authEmailError } from '../../utils/authEmail';
import { authStyles as styles } from './authStyles';

export function EmailVerificationScreen({ navigation, route }) {
  const { pendingEmail, setPendingEmail } = useSession();
  const email = route.params?.email || pendingEmail || '';
  const { seconds, startCooldown } = useEmailCooldown(60);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify() {
    const token = code.replace(/\D/g, '');
    setMessageType('error');
    if (!email) return setMessage('Return to signup and enter your email address again.');
    if (!/^\d{6}$/.test(token)) return setMessage('Enter the 6-digit code from your email.');
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
      if (error) return setMessage(authEmailError(error));
      await setPendingEmail(null);
      setMessageType('success'); setMessage('Email verified. Preparing your profile…');
    } catch (error) {
      setMessage(authEmailError(error));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setMessageType('error');
    if (!email) return setMessage('Return to signup and enter your email address again.');
    if (seconds > 0) return;
    setResending(true); setMessage('');
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      startCooldown();
      if (error) return setMessage(authEmailError(error));
      setMessageType('success'); setMessage('A new verification code has been sent.');
    } catch (error) {
      setMessage(authEmailError(error));
    } finally {
      setResending(false);
    }
  }

  async function useDifferentEmail() {
    await setPendingEmail(null);
    navigation.navigate('SignUp');
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>Enter the 6-digit code emailed to {email || 'your email address'}. The resend countdown does not expire your code.</Text>
      <View style={styles.form}>
        <FormField
          label="Verification code"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          placeholder="Enter code"
        />
        {message ? <Text style={messageType === 'success' ? styles.success : styles.error}>{message}</Text> : null}
        <PrimaryButton label={busy ? 'Verifying…' : 'Verify email'} onPress={busy || resending ? undefined : verify} />
        <Pressable disabled={busy || resending || seconds > 0} onPress={resend}><Text style={styles.link}>{resending ? 'Sending a new code…' : seconds > 0 ? `Resend available in ${seconds}s` : 'Send a new code'}</Text></Pressable>
        <Pressable disabled={busy || resending} onPress={useDifferentEmail}><Text style={styles.link}>Use a different email</Text></Pressable>
        <Pressable disabled={busy || resending} onPress={() => navigation.navigate('Login')}><Text style={styles.link}>Back to login</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}
