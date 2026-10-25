import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, radii, spacing, typography } from '../../theme';

export function MissingPublishedScreen({ navigation, route }) {
  const { reportId, reference } = route.params;
  const [shareError, setShareError] = useState('');

  async function shareReference() {
    setShareError('');
    try {
      await Share.share({ message: `A missing-animal report has been published on Homeward Paws. Reference: ${reference}. Open the app and search for this reference to view the latest details.` });
    } catch {
      setShareError('Sharing is unavailable right now. You can still tell someone the report reference above.');
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.iconTile}>
        <MaterialCommunityIcons name="alert-circle-outline" size={42} color={colors.missingOnTint} />
      </View>
      <Text style={styles.title}>Your missing report is public</Text>
      <Text style={styles.body}>People can now find it in Browse. Keep the details up to date, and tell us when your animal is home.</Text>
      <View style={styles.referenceCard}>
        <Text style={styles.label}>REPORT REFERENCE</Text>
        <Text selectable style={styles.reference}>{reference}</Text>
      </View>
      <PrimaryButton label="View public report" onPress={() => navigation.getParent()?.navigate('Browse', {
        screen: 'MissingReportDetail', params: { reportId }, initial: false
      })} />
      <Pressable accessibilityRole="button" onPress={shareReference} style={styles.secondaryButton}>
        <MaterialCommunityIcons name="share-variant-outline" size={21} color={colors.primary} />
        <Text style={styles.secondaryLabel}>Share reference</Text>
      </Pressable>
      {shareError ? <Text accessibilityRole="alert" style={styles.error}>{shareError}</Text> : null}
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.textButton}>
        <Text style={styles.link}>Back to Report</Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconTile: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center', borderRadius: radii.circle, backgroundColor: colors.missingTint, marginBottom: spacing.lg },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xl },
  referenceCard: { padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, marginBottom: spacing.xl },
  label: { ...typography.label, color: colors.textSecondary },
  reference: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: spacing.xs },
  secondaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md, backgroundColor: colors.surface },
  secondaryLabel: { ...typography.button, color: colors.primary },
  textButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  link: { ...typography.bodyStrong, color: colors.primary },
  error: { ...typography.body, color: colors.error, marginTop: spacing.md }
});
