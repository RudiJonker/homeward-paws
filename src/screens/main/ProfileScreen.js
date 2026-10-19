import { StyleSheet, Text } from 'react-native';

import { PlaceholderCard } from '../../components/PlaceholderCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, spacing, typography } from '../../theme';

export function ProfileScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Your animals, reports, privacy and support settings will live here.</Text>
      <PlaceholderCard icon="account-circle-outline" title="Member profile" body="Account creation and profile completion arrive in Checkpoint 1." />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl }
});
