import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { CheckRow } from '../../components/forms/CheckRow';
import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../config/constants';
import { links } from '../../config/links';
import { supabase } from '../../services/supabase';
import { useSession } from '../../context/SessionContext';
import { AUTH_REDIRECT_URL, authEmailError } from '../../utils/authEmail';
import { isValidEmail } from '../../utils/validation';
import { authStyles as styles } from './authStyles';

export function SignUpScreen({ navigation }) {
  const { setPendingEmail } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) return setMessage('Enter a valid email address.');
    if (password.length < 8) return setMessage('Use at least 8 characters for your password.');
    if (password !== confirmPassword) return setMessage('Passwords do not match.');
    if (!ageConfirmed || !accepted) return setMessage('Confirm your age and accept the Terms and Privacy Policy.');
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail, password,
        options: {
          data: { age_confirmed: true, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION },
          emailRedirectTo: AUTH_REDIRECT_URL
        }
      });
      if (error) return setMessage(authEmailError(error));
      if (!data.session) {
        await setPendingEmail(normalizedEmail);
        navigation.navigate('EmailVerification', { email: normalizedEmail });
      } else {
        await setPendingEmail(null);
      }
    } catch (error) {
      setMessage(authEmailError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Join your community and help animals get home safely.</Text>
      <View style={styles.form}>
        <FormField label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <FormField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
        <FormField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry autoComplete="new-password" />
        <CheckRow checked={ageConfirmed} onPress={() => setAgeConfirmed(!ageConfirmed)} label="I confirm that I am 18 or older." />
        <CheckRow checked={accepted} onPress={() => setAccepted(!accepted)} label="I accept the Terms of Use and Privacy Policy." />
        <View style={styles.inlineLinks}>
          <Pressable onPress={() => Linking.openURL(links.terms)}><Text style={styles.link}>Terms of Use</Text></Pressable>
          <Pressable onPress={() => Linking.openURL(links.privacy)}><Text style={styles.link}>Privacy Policy</Text></Pressable>
        </View>
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <PrimaryButton label={busy ? 'Creating account…' : 'Create account'} onPress={busy ? undefined : submit} />
        <Pressable onPress={() => navigation.navigate('Login')}><Text style={styles.link}>Already have an account? Log in</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}
