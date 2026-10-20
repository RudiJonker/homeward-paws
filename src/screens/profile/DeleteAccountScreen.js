import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { CheckRow } from '../../components/forms/CheckRow';
import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { links } from '../../config/links';
import { supabase } from '../../services/supabase';
import { colors, spacing, typography } from '../../theme';

export function DeleteAccountScreen() {
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function remove() {
    if (!confirmed) return setMessage('Confirm that you understand this cannot be undone.');
    setBusy(true); setMessage('');
    const { error } = await supabase.functions.invoke('delete-account', { body: { confirmed: true } });
    if (error) { setBusy(false); return setMessage(error.message); }
    await supabase.auth.signOut();
  }
  return <ScreenContainer><Text style={styles.title}>Delete your account</Text><Text style={styles.body}>Your account, profile, private contact information, home area and avatar will be permanently deleted. Future checkpoints will close and anonymise published case history before deletion. This cannot be undone.</Text><Text style={styles.link} onPress={() => Linking.openURL(links.deleteAccount)}>Read the full deletion information</Text><View style={styles.form}><CheckRow checked={confirmed} onPress={() => setConfirmed(!confirmed)} label="I understand that deleting my account is permanent." />{message ? <Text style={styles.error}>{message}</Text> : null}<PrimaryButton label={busy ? 'Deleting account…' : 'Permanently delete account'} onPress={busy ? undefined : remove} /></View></ScreenContainer>;
}

const styles = StyleSheet.create({ title: { ...typography.screenTitle, color: colors.error, marginBottom: spacing.lg }, body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg }, link: { ...typography.bodyStrong, color: colors.primary, marginBottom: spacing.xxl }, form: { gap: spacing.lg }, error: { ...typography.body, color: colors.error } });
