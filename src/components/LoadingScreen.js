import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../theme';

export function LoadingScreen() {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>Getting Homeward Paws ready…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, backgroundColor: colors.background },
  text: { ...typography.bodyStrong, color: colors.textSecondary }
});
