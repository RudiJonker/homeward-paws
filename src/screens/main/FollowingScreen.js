import { StyleSheet, Text } from 'react-native';

import { PlaceholderCard } from '../../components/PlaceholderCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, spacing, typography } from '../../theme';

export function FollowingScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Following</Text>
      <Text style={styles.subtitle}>Cases you follow will stay easy to find.</Text>
      <PlaceholderCard icon="heart-outline" title="Nothing followed yet" body="Follow a public report to receive important case updates." tint={colors.accentLight} color={colors.accent} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl }
});
