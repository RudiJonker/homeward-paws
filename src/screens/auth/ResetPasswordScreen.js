import { useState } from 'react';
import { Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useSession } from '../../context/SessionContext';
import { useEmailCooldown } from '../../hooks/useEmailCooldown';
import { supabase } from '../../services/supabase';
import { AUTH_REDIRECT_URL, authEmailError } from '../../utils/authEmail';
import { authStyles as styles } from './authStyles';

export function ResetPasswordScreen() {
  const { session, recoveryEmail, recoveryFlow, setRecoveryFlow } = useSession();
  const { seconds, startCooldown } = useEmailCooldown();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);

  async function submit() {
    if (!recoveryFlow || !session) return setErrorMessage('Your reset session has expired. Ask for a new email.');
    if (password.length < 8) return setErrorMessage('Use at least 8 characters for your password.');
    if (password !== confirmPassword) return setErrorMessage('Passwords do not match.');
    setBusy(true); setErrorMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return setErrorMessage(authEmailError(error));
      setUpdated(true);
      setMessage('Password updated. You can continue in the app.');
    } catch (error) {
      setErrorMessage(authEmailError(error));
    } finally {
      setBusy(false);
    }
  }

  async function sendNewEmail() {
    if (seconds > 0) return;
    if (!recoveryEmail) {
      await supabase.auth.signOut();
      setRecoveryFlow(false);
      return;
    }
    setBusy(true); setErrorMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(recoveryEmail, { redirectTo: AUTH_REDIRECT_URL });
      startCooldown();
      if (error) return setErrorMessage(authEmailError(error));
      setMessage('If there is an account for this address, we have sent a reset email.');
    } catch (error) {
      setErrorMessage(authEmailError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Choose a new password</Text>
      <Text style={styles.subtitle}>Use at least 8 characters. Your new password must match in both fields.</Text>
      <View style={styles.form}>
        {!updated && recoveryFlow && session ? (
          <>
            <FormField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
            <FormField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />
          </>
        ) : null}
        {!session || !recoveryFlow ? <Text style={styles.error}>Your reset session has expired. Ask for a new email.</Text> : null}
        {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        {updated ? (
          <PrimaryButton label="Continue" onPress={() => setRecoveryFlow(false)} />
        ) : recoveryFlow && session ? (
          <PrimaryButton label={busy ? 'Updating password…' : 'Update password'} onPress={busy ? undefined : submit} />
        ) : null}
        {!updated ? <PrimaryButton label={busy ? 'Sending…' : seconds > 0 ? `Send another email in ${seconds}s` : recoveryEmail ? 'Send a new reset email' : 'Start again'} onPress={busy || seconds > 0 ? undefined : sendNewEmail} /> : null}
      </View>
    </ScreenContainer>
  );
}
