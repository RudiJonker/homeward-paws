import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormField } from '../../components/forms/FormField';
import { CONTENT_REPORT_REASONS } from '../../config/contentReportReasons';
import { submitMissingContentReport } from '../../services/contentReportService';
import { getPublicMissingReport } from '../../services/missingReportService';
import { colors, radii, spacing, typography } from '../../theme';

export function ReportMissingContentScreen({ navigation, route }) {
  const { reportId, photoPath = null, reference } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [dirty, setDirty] = useState(false);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const next = await getPublicMissingReport(reportId);
      if (!next || (photoPath && !next.photo_paths?.includes(photoPath))) {
        setLoadError('This public report or photo is no longer available.');
        setReport(null);
      } else {
        setReport(next);
      }
    } catch {
      setLoadError('Could not load this report. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [reportId, photoPath]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  usePreventRemove(dirty && !submitted, ({ data }) => {
    Alert.alert('Leave this report?', 'Your unsent concern will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  async function submit() {
    if (inFlight.current || !report) return;
    if (!reason) {
      setError('Choose what concerns you.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError('');
    try {
      await submitMissingContentReport({ reportId, photoPath, reason, description });
      setDirty(false);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError.code === '23514'
        ? 'This public report or photo is no longer available, or the details need review.'
        : 'Could not confirm that your concern was sent. Check your connection and try again. Retrying will not create a duplicate.');
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading public report…</Text></ScreenContainer>;
  if (loadError) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={45} color={colors.error} /><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><PrimaryButton label="Try again" onPress={load} /><Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}><Text style={styles.link}>Back to report</Text></Pressable></View></ScreenContainer>;
  if (submitted) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="check-circle-outline" size={52} color={colors.primary} /><Text style={styles.title}>Concern sent</Text><Text style={styles.message}>Thank you. Your report was saved privately for review. You can keep browsing.</Text><PrimaryButton label="Back to report" onPress={() => navigation.goBack()} /></View></ScreenContainer>;

  return <ScreenContainer>
    <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={23} color={colors.textPrimary} /><Text style={styles.backText}>Back to report</Text></Pressable>
    <Text style={styles.title}>Report a concern</Text>
    <Text style={styles.subtitle}>About {photoPath ? 'a photo in' : 'missing report'} {reference || report.public_reference}. Your answer is private and is not sent to the animal owner.</Text>
    <Text style={styles.label}>What concerns you?</Text>
    <View style={styles.reasons}>{CONTENT_REPORT_REASONS.map(([code, label]) => <Pressable key={code} accessibilityRole="radio" accessibilityState={{ selected: reason === code, disabled: busy }} disabled={busy} onPress={() => { setReason(code); setDirty(true); setError(''); }} style={[styles.reason, reason === code && styles.selected]}><MaterialCommunityIcons name={reason === code ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={colors.primary} /><Text style={styles.reasonText}>{label}</Text></Pressable>)}</View>
    <View style={styles.noteField}><FormField label="More detail (optional)" value={description} onChangeText={(value) => { setDescription(value); setDirty(true); }} editable={!busy} maxLength={500} multiline numberOfLines={4} placeholder="Briefly explain the concern" /><Text style={styles.hint}>Please do not include private addresses or contact details. Only authorised reviewers can read this note.</Text></View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.action}><PrimaryButton label={busy ? 'Sending…' : 'Send concern'} disabled={busy} onPress={submit} /></View>
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  back: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', marginBottom: spacing.md },
  backText: { ...typography.bodyStrong, color: colors.textPrimary },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.sm },
  reasons: { gap: spacing.sm },
  reason: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  selected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  reasonText: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  noteField: { marginTop: spacing.xl, gap: spacing.xs },
  hint: { ...typography.caption, color: colors.textSecondary },
  action: { marginTop: spacing.xl },
  link: { ...typography.bodyStrong, color: colors.primary },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }
});
