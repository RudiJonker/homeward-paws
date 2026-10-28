import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppDialog } from '../../components/AppDialog';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormField } from '../../components/forms/FormField';
import { MISSING_CLOSURE_REASONS } from '../../config/missingClosureReasons';
import { closeMissingReport, getMyMissingReportStatus } from '../../services/missingReportService';
import { colors, radii, spacing, typography } from '../../theme';

export function CloseMissingReportScreen({ navigation, route }) {
  const { showDialog } = useAppDialog();
  const { reportId, reference } = route.params;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const [privateNote, setPrivateNote] = useState('');
  const [animalSafeConfirmed, setAnimalSafeConfirmed] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retryOnly, setRetryOnly] = useState(false);
  const [dirty, setDirty] = useState(false);
  const requestKey = useRef(null);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      setReport(await getMyMissingReportStatus(reportId));
    } catch {
      setLoadError('Could not load this case. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [reportId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  usePreventRemove(dirty, ({ data }) => {
    showDialog('Leave closure details?', retryOnly
      ? 'We could not confirm whether the alert was closed. Check My Reports before starting again.'
      : 'These unsaved details will be lost. The missing alert will stay active.', [
      { text: 'Stay here', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  async function submit() {
    if (inFlight.current || report?.status !== 'active') return;
    if (!reasonCode) {
      setSaveError('Choose why you are closing this alert.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setSaveError('');
    if (!requestKey.current) requestKey.current = `closure-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    try {
      await closeMissingReport(reportId, {
        reasonCode,
        privateNote: privateNote.trim() || null,
        animalSafeConfirmed
      }, requestKey.current);
      setDirty(false);
      showDialog('Alert closed', animalSafeConfirmed
        ? 'The public alert has ended. You confirmed the animal is safe; this is not recorded as a reunion.'
        : 'The public alert has ended. Your animal remains marked MISSING. The private case file is available in My Reports.', [
        { text: 'View My Reports', onPress: () => navigation.popTo('MyReports') }
      ]);
    } catch (error) {
      if (error.code === '23514' || error.code === '42501') {
        requestKey.current = null;
        setRetryOnly(false);
        setSaveError(`The alert was not closed. Review the details and try again. ${error.message}`);
      } else {
        setRetryOnly(true);
        setSaveError('We could not confirm whether the alert was closed. Retry the same request; it cannot create a duplicate.');
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function confirmSubmit() {
    if (!reasonCode) {
      setSaveError('Choose why you are closing this alert.');
      return;
    }
    showDialog('Close this missing alert?', animalSafeConfirmed
      ? 'This removes the alert from public Browse and marks the animal SAFE because you explicitly confirmed that this report was incorrect. It will not be called a reunion.'
      : 'This removes the alert from public Browse. The animal will still be marked MISSING, and the case file will remain in My Reports. Closing does not mean the animal was found.', [
      { text: 'Keep alert active', style: 'cancel' },
      { text: 'Close alert', style: 'destructive', onPress: submit }
    ]);
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading case…</Text></ScreenContainer>;
  if (loadError) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><PrimaryButton label="Try again" onPress={load} /></View></ScreenContainer>;
  if (report?.status !== 'active') return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="file-check-outline" size={48} color={colors.textSecondary} /><Text style={styles.message}>This missing alert is no longer active.</Text><PrimaryButton label="Back to My Reports" onPress={() => navigation.popTo('MyReports')} /></View></ScreenContainer>;

  const locked = busy || retryOnly;
  const canConfirmSafe = reasonCode === 'mistake' || reasonCode === 'incorrect_information';
  return <ScreenContainer>
    <View style={styles.status}><MaterialCommunityIcons name="archive-outline" size={19} color={colors.textSecondary} /><Text style={styles.statusText}>CLOSE WITHOUT REUNION</Text></View>
    <Text style={styles.title}>End this missing alert?</Text>
    <Text style={styles.subtitle}>Report {reference}. The case will leave public Browse, but you can revisit its private history in My Reports. This does not claim the animal was reunited.</Text>
    <Text style={styles.label}>Why are you closing it?</Text>
    <View style={styles.reasons}>{MISSING_CLOSURE_REASONS.map((reason) => <Pressable key={reason.code} accessibilityRole="radio" accessibilityState={{ selected: reasonCode === reason.code, disabled: locked }} disabled={locked} onPress={() => { setReasonCode(reason.code); setAnimalSafeConfirmed(false); setDirty(true); setSaveError(''); }} style={[styles.reason, reasonCode === reason.code && styles.reasonSelected]}><MaterialCommunityIcons name={reasonCode === reason.code ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={colors.primary} /><Text style={styles.reasonText}>{reason.label}</Text></Pressable>)}</View>
    <View style={styles.field}><FormField label="Private note (optional)" value={privateNote} onChangeText={(value) => { setPrivateNote(value); setDirty(true); }} maxLength={500} editable={!locked} placeholder="Anything you want to remember about this decision" /><Text style={styles.hint}>Only you and authorised admins can read the reason and note. Neither appears in the public outcome.</Text></View>
    {canConfirmSafe ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: animalSafeConfirmed, disabled: locked }} disabled={locked} onPress={() => { setAnimalSafeConfirmed((current) => !current); setDirty(true); }} style={styles.checkbox}><MaterialCommunityIcons name={animalSafeConfirmed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={colors.primary} /><Text style={styles.checkboxText}>I know the animal is safe; the missing report was incorrect</Text></Pressable> : null}
    <View style={styles.notice}><MaterialCommunityIcons name={animalSafeConfirmed ? 'home-heart' : 'alert-circle-outline'} size={22} color={animalSafeConfirmed ? colors.reunitedOnTint : colors.missingOnTint} /><Text style={styles.noticeText}>{animalSafeConfirmed ? 'The animal profile will become SAFE. This is not a reunion.' : 'The animal profile will stay MISSING, even though the public alert ends.'}</Text></View>
    <Text style={styles.hint}>This file stays view-only. If the search continues, start a new private draft and review its details before publishing a new alert.</Text>
    {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
    <View style={styles.action}><PrimaryButton label={busy ? 'Closing…' : retryOnly ? 'Retry the same closure' : 'Close missing alert'} disabled={busy} onPress={retryOnly ? submit : confirmSubmit} /></View>
    {retryOnly ? <Text style={styles.hint}>Fields are locked during recovery so the retry uses the exact same details.</Text> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  statusText: { ...typography.caption, color: colors.textSecondary },
  title: { ...typography.screenTitle, color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  label: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.sm },
  reasons: { gap: spacing.sm },
  reason: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  reasonSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  reasonText: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  field: { marginTop: spacing.xl, gap: spacing.xs },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  checkbox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  checkboxText: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  notice: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.xl, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  noticeText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  action: { marginTop: spacing.xl },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, marginTop: spacing.md },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }
});
