import { StyleSheet } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export const authStyles = StyleSheet.create({
  form: { gap: spacing.lg },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  link: { ...typography.bodyStrong, color: colors.primary, textAlign: 'center', paddingVertical: spacing.md },
  inlineLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs },
  error: { ...typography.body, color: colors.error },
  success: { ...typography.body, color: colors.reunited }
});
