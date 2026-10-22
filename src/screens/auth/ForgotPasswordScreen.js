import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useSession } from '../../context/SessionContext';
import { useEmailCooldown } from '../../hooks/useEmailCooldown';
import { supabase } from '../../services/supabase';
import { AUTH_REDIRECT_URL, authEmailError } from '../../utils/authEmail';
import { isValidEmail } from '../../utils/validation';
import { authStyles as styles } from './authStyles';

const NEUTRAL_MESSAGE = 'If there is an account for this address, we have sent a reset email.';

export function ForgotPasswordScreen() {
  const { setRecoveryEmail, setRecoveryFlow } = useSession();
  const { seconds, startCooldown } = useEmailCooldown();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  async function sendReset() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) return setErrorMessage('Enter a valid email address.');
    if (busy || seconds > 0) return;
    setBusy(true); setErrorMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo: AUTH_REDIRECT_URL });
      if (error) setErrorMessage(authEmailError(error));
      else {
        setSent(true);
        setMessage(NEUTRAL_MESSAGE);
      }
      startCooldown();
    } catch (error) {
      setErrorMessage(authEmailError(error));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode() {
    const token = code.replace(/\D/g, '');
    if (!/^\d{6}$/.test(token)) return setErrorMessage('Enter the 6-digit code from the latest email.');
    setBusy(true); setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: 'recovery' });
      if (error) return setErrorMessage(authEmailError(error));
      if (!data.session) return setErrorMessage('That code is not valid. Check the latest email.');
      setRecoveryEmail(email.trim().toLowerCase());
      setRecoveryFlow(true);
    } catch (error) {
      setErrorMessage(authEmailError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.subtitle}>Enter your email address. We will send a 6-digit code you can enter here to choose a new password.</Text>
      <View style={styles.form}>
        <FormField label="Email address" value={email} onChangeText={(value) => { setEmail(value); setSent(false); setCode(''); setMessage(''); }} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {sent ? (
          <FormField
            label="Reset code"
            value={code}
            onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            maxLength={6}
          />
        ) : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {sent ? <PrimaryButton label={busy ? 'Checking code…' : 'Continue with code'} onPress={busy ? undefined : verifyCode} /> : null}
        {sent ? (
          <Pressable disabled={busy || seconds > 0} onPress={sendReset}>
            <Text style={styles.link}>{busy ? 'Sending…' : seconds > 0 ? `Send another email in ${seconds}s` : 'Send another email'}</Text>
          </Pressable>
        ) : <PrimaryButton label={busy ? 'Sending…' : 'Send reset email'} onPress={busy || seconds > 0 ? undefined : sendReset} />}
      </View>
    </ScreenContainer>
  );
}
