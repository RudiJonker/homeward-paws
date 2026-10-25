import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

export function PrimaryButton({ label, onPress, accessibilityLabel = label, disabled = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && !disabled && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: spacing.xl },
  pressed: { backgroundColor: colors.primaryDark },
  disabled: { opacity: 0.55 },
  label: { ...typography.button, color: colors.textOnPrimary, width: '100%', textAlign: 'center', textAlignVertical: 'center' }
});
