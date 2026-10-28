import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppDialog } from '../../components/AppDialog';
import { ScreenContainer } from '../../components/ScreenContainer';
import { DateTimeField } from '../../components/forms/DateTimeField';
import { FormField } from '../../components/forms/FormField';
import { confirmMissingReunion, getMissingReunionContext } from '../../services/missingReportService';
import { colors, radii, spacing, typography } from '../../theme';

function pickedReunionTime(dateValue, timeValue, lastSeenAt) {
  if (!dateValue || !timeValue) return { error: 'Choose the date and time the animal was reunited.' };
  const picked = new Date(`${dateValue}T${timeValue}:00`);
  if (Number.isNaN(picked.getTime())) return { error: 'Choose a valid date and time.' };
  if (picked.getTime() > Date.now() + 5 * 60 * 1000) return { error: 'The reunion time cannot be in the future.' };
  if (lastSeenAt && picked.getTime() < new Date(lastSeenAt).getTime()) {
    return { error: 'The reunion must be after the last confirmed sighting.' };
  }
  return { iso: picked.toISOString() };
}

export function ConfirmMissingReunionScreen({ navigation, route }) {
  const { showDialog } = useAppDialog();
  const { reportId, reference } = route.params;
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');
  const [place, setPlace] = useState('');
  const [assistance, setAssistance] = useState('');
  const [veterinaryHelpNeeded, setVeterinaryHelpNeeded] = useState(false);
  const [publicStoryConsent, setPublicStoryConsent] = useState(false);
  const [errors, setErrors] = useState({});
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
      const next = await getMissingReunionContext(reportId);
      setContext(next);
    } catch {
      setLoadError('Could not load this missing report. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  usePreventRemove(dirty, ({ data }) => {
    showDialog('Leave reunion details?', retryOnly
      ? 'We could not confirm whether the reunion was saved. Check My Reports before starting again.'
      : 'These unsaved details will be lost. The missing alert will stay active.', [
      { text: 'Stay here', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  function validate() {
    const next = {};
    const time = pickedReunionTime(dateValue, timeValue, context?.last_seen_at);
    if (time.error) next.reunitedAt = time.error;
    if (!place.trim()) next.place = 'Describe where the reunion happened.';
    if (place.trim().length > 300) next.place = 'Keep the place under 300 characters.';
    if (assistance.trim().length > 500) next.assistance = 'Keep this under 500 characters.';
    return { errors: next, reunitedAt: time.iso };
  }

  async function submit() {
    if (inFlight.current || !context) return;
    const checked = validate();
    if (Object.keys(checked.errors).length) {
      setErrors(checked.errors);
      setSaveError('Please correct the highlighted details. The alert is still active.');
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setSaveError('');
    if (!requestKey.current) requestKey.current = `reunion-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    try {
      await confirmMissingReunion(reportId, {
        reunitedAt: checked.reunitedAt,
        place: place.trim(),
        assistance: assistance.trim() || null,
        veterinaryHelpNeeded,
        publicStoryConsent
      }, requestKey.current);
      setDirty(false);
      showDialog('Reunion confirmed', 'The missing alert has ended and the animal profile is SAFE. The reunion place and assistance details stay private.', [
        { text: 'View My Reports', onPress: () => navigation.popTo('MyReports') }
      ]);
    } catch (error) {
      if (error.code === '23514' || error.code === '42501') {
        requestKey.current = null;
        setRetryOnly(false);
        setSaveError(`The reunion was not saved. Review the details and try again. ${error.message}`);
      } else {
        setRetryOnly(true);
        setSaveError('We could not confirm whether the reunion was saved. Retry the same request; it cannot create a duplicate.');
      }
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  function confirmSubmit() {
    const checked = validate();
    if (Object.keys(checked.errors).length) {
      setErrors(checked.errors);
      setSaveError('Please correct the highlighted details. The alert is still active.');
      return;
    }
    showDialog('End the missing alert?', 'Only confirm this when the animal is back in safe care. This marks the report REUNITED, stops new sightings and returns the animal profile to SAFE.', [
      { text: 'Keep alert active', style: 'cancel' },
      { text: 'Confirm reunion', onPress: submit }
    ]);
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading your missing report…</Text></ScreenContainer>;
  if (loadError) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text accessibilityRole="alert" style={styles.error}>{loadError}</Text><PrimaryButton label="Try again" onPress={load} /></View></ScreenContainer>;
  if (!context) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="file-search-outline" size={48} color={colors.textSecondary} /><Text style={styles.message}>This missing alert is no longer active.</Text><PrimaryButton label="Back to My Reports" onPress={() => navigation.popTo('MyReports')} /></View></ScreenContainer>;

  const locked = busy || retryOnly;
  return <ScreenContainer>
    <View style={styles.status}><MaterialCommunityIcons name="home-heart" size={20} color={colors.reunitedOnTint} /><Text style={styles.statusText}>CONFIRM REUNION</Text></View>
    <Text style={styles.title}>Is {context.animal_name || 'the animal'} safely back?</Text>
    <Text style={styles.subtitle}>Report {reference}. Confirming ends the public missing alert. It does not delete its history.</Text>
    <DateTimeField label="When were you reunited?" dateValue={dateValue} timeValue={timeValue} onChange={(date, time) => { setDateValue(date); setTimeValue(time); setErrors((current) => ({ ...current, reunitedAt: undefined })); setDirty(true); }} errors={[errors.reunitedAt]} disabled={locked} />
    <View style={styles.field}><FormField label="Where did the reunion happen? (private)" value={place} onChangeText={(value) => { setPlace(value); setErrors((current) => ({ ...current, place: undefined })); setDirty(true); }} error={errors.place} placeholder="For example, at home or with a neighbour" maxLength={300} editable={!locked} /><Text style={styles.hint}>This place is kept private and is never added to the public report or map.</Text></View>
    <View style={styles.field}><FormField label="Who helped? (optional, private)" value={assistance} onChangeText={(value) => { setAssistance(value); setErrors((current) => ({ ...current, assistance: undefined })); setDirty(true); }} multiline maxLength={500} editable={!locked} placeholder="Briefly note any help you want to remember" error={errors.assistance} /></View>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: veterinaryHelpNeeded, disabled: locked }} disabled={locked} onPress={() => { setVeterinaryHelpNeeded((current) => !current); setDirty(true); }} style={styles.checkbox}><MaterialCommunityIcons name={veterinaryHelpNeeded ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={colors.primary} /><Text style={styles.checkboxText}>The animal needs veterinary help</Text></Pressable>
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: publicStoryConsent, disabled: locked }} disabled={locked} onPress={() => { setPublicStoryConsent((current) => !current); setDirty(true); }} style={styles.checkbox}><MaterialCommunityIcons name={publicStoryConsent ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={colors.primary} /><Text style={styles.checkboxText}>You may ask me about sharing a reunion story later</Text></Pressable>
    <Text style={styles.hint}>No story or photo is published now. Only the reunited status becomes public.</Text>
    {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
    <View style={styles.action}><PrimaryButton label={busy ? 'Confirming…' : retryOnly ? 'Retry the same reunion' : 'Confirm reunion'} disabled={busy} onPress={retryOnly ? submit : confirmSubmit} /></View>
    {retryOnly ? <Text style={styles.hint}>Fields are locked during recovery so the retry uses the exact same details.</Text> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.reunitedTint, borderRadius: radii.pill },
  statusText: { ...typography.caption, color: colors.reunitedOnTint },
  title: { ...typography.screenTitle, color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  field: { gap: spacing.xs, marginTop: spacing.lg },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  checkbox: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  checkboxText: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  action: { marginTop: spacing.xl },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, marginTop: spacing.md },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl }
});
