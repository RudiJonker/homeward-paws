import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useSession } from '../../context/SessionContext';
import { supabase } from '../../services/supabase';
import { authEmailError, isEmailNotConfirmed } from '../../utils/authEmail';
import { authStyles as styles } from './authStyles';

export function LoginScreen({ navigation }) {
  const { setPendingEmail } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMessage('');
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      if (isEmailNotConfirmed(error)) {
        await setPendingEmail(normalizedEmail);
        navigation.navigate('EmailVerification', { email: normalizedEmail });
      } else if (error) setMessage(authEmailError(error));
      else await setPendingEmail(null);
    } catch (error) {
      setMessage(authEmailError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Log in to manage your animals and cases.</Text>
      <View style={styles.form}>
        <FormField label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <PrimaryButton label={busy ? 'Logging in…' : 'Log in'} onPress={busy ? undefined : submit} />
        <Pressable onPress={() => navigation.navigate('ForgotPassword')}><Text style={styles.link}>Forgot password?</Text></Pressable>
        <Pressable onPress={() => navigation.navigate('SignUp')}><Text style={styles.link}>Create an account</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}
