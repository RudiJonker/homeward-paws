import { Linking, StyleSheet, Text } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { links } from '../../config/links';
import { supabase } from '../../services/supabase';
import { colors, spacing, typography } from '../../theme';

export function SuspendedAccountScreen() {
  return <ScreenContainer contentContainerStyle={styles.container}><Text style={styles.title}>Account unavailable</Text><Text style={styles.body}>This account is currently suspended and cannot make changes. Contact support if you believe this is a mistake.</Text><PrimaryButton label="Contact support" onPress={() => Linking.openURL(`mailto:${links.supportEmail}?subject=Homeward%20Paws%20support`)} /><Text style={styles.link} onPress={() => supabase.auth.signOut()}>Log out</Text></ScreenContainer>;
}

const styles = StyleSheet.create({ container: { flexGrow: 1, justifyContent: 'center' }, title: { ...typography.screenTitle, color: colors.textPrimary, marginBottom: spacing.md }, body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xxl }, link: { ...typography.bodyStrong, color: colors.primary, textAlign: 'center', padding: spacing.lg } });
