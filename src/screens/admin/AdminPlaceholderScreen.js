import { StyleSheet, Text } from 'react-native';

import { PlaceholderCard } from '../../components/PlaceholderCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, spacing, typography } from '../../theme';

export function AdminPlaceholderScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Administration</Text>
      <Text style={styles.subtitle}>This workspace is reserved for authorised administrators.</Text>
      <PlaceholderCard icon="shield-account-outline" title="Admin tools" body="Moderation and management tools arrive in Checkpoint 5." />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl }
});
