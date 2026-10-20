import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { supabase } from '../../services/supabase';
import { authStyles as styles } from './authStyles';

export function EmailVerificationScreen({ navigation, route }) {
  const email = route.params?.email ?? '';
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  async function verify() {
    const token = code.replace(/\D/g, '');
    setMessageType('error');
    if (!email) return setMessage('Return to signup and enter your email address again.');
    if (!/^\d{6,8}$/.test(token)) return setMessage('Enter the verification code from your email.');
    setBusy(true); setMessage('');
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    if (error) return setMessage(error.message);
    setMessageType('success'); setMessage('Email verified. Preparing your profile…');
  }

  async function resend() {
    setMessageType('error');
    if (!email) return setMessage('Return to signup and enter your email address again.');
    setResending(true); setMessage('');
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    setResending(false);
    if (error) return setMessage(error.message);
    setMessageType('success'); setMessage('A new verification code has been sent.');
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>Verify your email</Text>
      <Text style={styles.subtitle}>Enter the verification code sent to {email || 'your email address'}.</Text>
      <View style={styles.form}>
        <FormField
          label="Verification code"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={8}
          placeholder="Enter code"
        />
        {message ? <Text style={messageType === 'success' ? styles.success : styles.error}>{message}</Text> : null}
        <PrimaryButton label={busy ? 'Verifying…' : 'Verify email'} onPress={busy || resending ? undefined : verify} />
        <Pressable disabled={busy || resending} onPress={resend}><Text style={styles.link}>{resending ? 'Sending a new code…' : 'Send a new code'}</Text></Pressable>
        <Pressable disabled={busy || resending} onPress={() => navigation.navigate('Login')}><Text style={styles.link}>Back to login</Text></Pressable>
      </View>
    </ScreenContainer>
  );
}
