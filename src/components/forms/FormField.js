import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, fonts, radii, spacing, typography } from '../../theme';

export function FormField({ label, error, suffix, ...inputProps }) {
  const isPassword = Boolean(inputProps.secureTextEntry);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, inputProps.multiline && styles.multiline, error && styles.inputError]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={suffix ? `${label}, ${suffix}` : label}
          secureTextEntry={isPassword && !passwordVisible}
          style={[styles.input, inputProps.multiline && styles.multilineInput]}
          placeholderTextColor={colors.textSecondary}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
            hitSlop={8}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={styles.visibilityButton}
          >
            <MaterialCommunityIcons name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { ...typography.bodyStrong, color: colors.textPrimary },
  inputShell: { minHeight: 50, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm, backgroundColor: colors.surface },
  input: { flex: 1, minHeight: 48, color: colors.textPrimary, fontFamily: fonts.regular, fontSize: 16, paddingHorizontal: spacing.md },
  multiline: { minHeight: 100, alignItems: 'flex-start' },
  multilineInput: { minHeight: 98, paddingTop: spacing.md, textAlignVertical: 'top' },
  suffix: { ...typography.bodyStrong, color: colors.textSecondary, paddingRight: spacing.md },
  visibilityButton: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  inputError: { borderColor: colors.error },
  error: { ...typography.caption, color: colors.error }
});
