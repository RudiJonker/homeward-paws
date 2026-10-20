import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { supabase } from '../../services/supabase';
import { authStyles as styles } from './authStyles';

export function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setMessage(error.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error.message);
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
        <Pressable onPress={() => navigation.navigate('SignUp')}><Text style={styles.link}>Create an account</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}
