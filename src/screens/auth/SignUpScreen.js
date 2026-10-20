import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { CheckRow } from '../../components/forms/CheckRow';
import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { PRIVACY_VERSION, TERMS_VERSION } from '../../config/constants';
import { links } from '../../config/links';
import { supabase } from '../../services/supabase';
import { isValidEmail } from '../../utils/validation';
import { authStyles as styles } from './authStyles';

export function SignUpScreen({ navigation }) {
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
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail, password,
      options: {
        data: { age_confirmed: true, terms_version: TERMS_VERSION, privacy_version: PRIVACY_VERSION }
      }
    });
    setBusy(false);
    if (error) return setMessage(error.message);
    // Development projects may temporarily have email confirmation disabled.
    // When production SMTP is configured, an unconfirmed signup has no session
    // and continues through the prepared in-app verification-code screen.
    if (!data.session) navigation.navigate('EmailVerification', { email: normalizedEmail });
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
