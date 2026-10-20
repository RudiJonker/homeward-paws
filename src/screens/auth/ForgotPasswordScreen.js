import { useState } from 'react';
import { Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { supabase } from '../../services/supabase';
import { authStyles as styles } from './authStyles';

export function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  async function submit() {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: 'homewardpaws://auth/reset' });
    setMessage(error ? error.message : 'If an account exists, a reset link is on its way.');
  }
  return (
    <ScreenContainer>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.subtitle}>Enter your email and we’ll send a secure reset link.</Text>
      <View style={styles.form}>
        <FormField label="Email address" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <PrimaryButton label="Send reset link" onPress={submit} />
      </View>
    </ScreenContainer>
  );
}
