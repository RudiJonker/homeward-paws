import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

export function PrimaryButton({ label, onPress, accessibilityLabel = label }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing.xl },
  pressed: { backgroundColor: colors.primaryDark },
  label: { ...typography.button, color: colors.textOnPrimary }
});
