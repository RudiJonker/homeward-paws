import { StyleSheet, Text, View } from 'react-native';

import { PlaceholderCard } from '../../components/PlaceholderCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, radii, spacing, typography } from '../../theme';

export function HomeScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>YOUR AREA</Text>
      <Text style={styles.title}>Welcome to Homeward Paws</Text>
      <Text style={styles.subtitle}>Together, we can help animals find their way home.</Text>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Let’s bring them home</Text>
        <Text style={styles.heroBody}>Choose Report below whenever an animal is missing, found, or still roaming.</Text>
      </View>
      <Text style={styles.sectionTitle}>Nearby activity</Text>
      <PlaceholderCard icon="alert-circle" title="Missing near you" body="Local missing reports will appear here." tint={colors.missingTint} color={colors.missing} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.caption, color: colors.primary, marginBottom: spacing.xs },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  hero: { padding: spacing.xl, borderRadius: radii.xl, backgroundColor: colors.primaryLight, marginBottom: spacing.xxxl },
  heroTitle: { ...typography.sectionTitle, color: colors.primaryDark, marginBottom: spacing.sm },
  heroBody: { ...typography.body, color: colors.textSecondary },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: spacing.md }
});
