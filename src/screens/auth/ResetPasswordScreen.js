import { useState } from 'react';
import { Text, View } from 'react-native';

import { FormField } from '../../components/forms/FormField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { supabase } from '../../services/supabase';
import { authStyles as styles } from './authStyles';

export function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  async function submit() {
    if (password.length < 8) return setMessage('Use at least 8 characters.');
    const { error } = await supabase.auth.updateUser({ password });
    setMessage(error ? error.message : 'Password updated. You can continue in the app.');
  }
  return (
    <ScreenContainer>
      <Text style={styles.title}>Choose a new password</Text>
      <Text style={styles.subtitle}>Expired or previously used links cannot be reused; request another link if this one fails.</Text>
      <View style={styles.form}>
        <FormField label="New password" value={password} onChangeText={setPassword} secureTextEntry />
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <PrimaryButton label="Update password" onPress={submit} />
      </View>
    </ScreenContainer>
  );
}
