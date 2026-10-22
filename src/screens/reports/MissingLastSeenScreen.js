import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { DateTimeField } from '../../components/forms/DateTimeField';
import { FormField } from '../../components/forms/FormField';
import { getMissingDraft, saveMissingDraft } from '../../services/missingReportService';
import { colors, radii, spacing, typography } from '../../theme';
import { MISSING_CIRCUMSTANCES, combineTravelObservation, validateMissingLastSeen } from '../../utils/missingLastSeen';

const blankDetails = {
  date: '', time: '', timeAccuracy: '', circumstance: '', travelDirection: 'unknown', direction: '',
  absenceNoticedDate: '', absenceNoticedTime: '', peopleVehicles: '', explanation: ''
};

export function MissingLastSeenScreen({ navigation, route }) {
  const { animalId, reportId } = route.params;
  const [details, setDetails] = useState(blankDetails);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setLoadFailed(false);
    try {
      const draft = await getMissingDraft(reportId);
      if (draft.animal_id !== animalId || draft.draft_payload?.appearance?.confirmed !== true) {
        throw new Error('Complete the appearance step before entering last-seen details.');
      }
      const lastSeen = draft.draft_payload?.last_seen ?? {};
      const travelObservation = combineTravelObservation(lastSeen.direction, lastSeen.peopleVehicles);
      setDetails({
        ...Object.fromEntries(Object.keys(blankDetails).map((key) => [key, lastSeen[key] ?? blankDetails[key]])),
        travelDirection: (travelObservation || lastSeen.travelDirection === 'known') ? 'known' : 'unknown',
        direction: travelObservation,
        peopleVehicles: ''
      });
      setDirty(false);
      setErrors({});
    } catch (loadError) {
      setLoadFailed(true);
      setError(`We couldn't load this private draft. Check your connection and try again. ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [animalId, reportId]);

  useFocusEffect(useCallback(() => {
    if (!loadedOnce.current) {
      loadedOnce.current = true;
      load();
    }
  }, [load]));

  usePreventRemove(dirty, ({ data }) => {
    Alert.alert('Leave without saving?', 'Your changes on this screen will be lost. Your last saved private draft will remain.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  function update(field, value) {
    setDetails((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setDirty(true);
    setSavedMessage('');
  }

  function updateDateTime(dateField, timeField, date, time) {
    setDetails((current) => ({ ...current, [dateField]: date, [timeField]: time }));
    setErrors((current) => ({ ...current, [dateField]: undefined, [timeField]: undefined }));
    setDirty(true);
    setSavedMessage('');
  }

  function updateTravelDirection(value) {
    if (value === details.travelDirection) return;
    setDetails((current) => ({ ...current, travelDirection: value, direction: value === 'unknown' ? '' : current.direction, peopleVehicles: '' }));
    setErrors((current) => ({ ...current, direction: undefined }));
    setDirty(true);
    setSavedMessage('');
  }

  async function save({ finishStep = false } = {}) {
    if (busy) return;
    const validation = validateMissingLastSeen(details);
    if (finishStep && !validation.valid) {
      setErrors(validation.errors);
      setError('Please correct the highlighted details, or save this as an incomplete draft for later.');
      return;
    }
    setBusy(true);
    setError('');
    setSavedMessage('');
    try {
      const latestDraft = await getMissingDraft(reportId);
      if (latestDraft.animal_id !== animalId || latestDraft.draft_payload?.appearance?.confirmed !== true) {
        throw new Error('This draft changed. Return to the appearance step and reopen it.');
      }
      const payload = {
        ...latestDraft.draft_payload,
        last_seen: {
          ...details,
          last_seen_at: validation.valid ? validation.lastSeenAt : null,
          absence_noticed_at: validation.valid ? validation.absenceNoticedAt : null,
          complete: finishStep && validation.valid
        }
      };
      await saveMissingDraft(animalId, payload, reportId);
      setDirty(false);
      setErrors({});
      const message = finishStep
        ? 'Your last-seen details were saved. This report is still a private draft and has not been published.'
        : 'Your incomplete draft was saved privately. You can return to finish it later.';
      setSavedMessage(message);
      if (finishStep) {
        navigation.navigate('MissingLastSeenLocation', { animalId, reportId });
      } else {
        Alert.alert('Draft saved', message, [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Back to Report', onPress: () => navigation.popTo('ReportMenu') }
        ]);
      }
    } catch (saveError) {
      setError(`Your changes were not saved. Check your connection and try again. ${saveError.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading last-seen details…</Text></ScreenContainer>;
  if (loadFailed) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /><Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.textButton}><Text style={styles.link}>Back to appearance</Text></Pressable></View></ScreenContainer>;

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>PRIVATE MISSING-REPORT DRAFT · STEP 3</Text>
      <Text style={styles.title}>When was the animal last seen?</Text>
      <Text style={styles.subtitle}>Record when you last definitely saw the animal. You will add the place on the next screen. You can save an incomplete draft and return later.</Text>
      <View style={styles.guide}>
        <Text style={styles.guideTitle}>What to enter and why</Text>
        <GuideItem text="Last seen (required): Last confirmed sighting; starts the search timeline." />
        <GuideItem text="Time accuracy (required): How certain you are about that time." />
        <GuideItem text="What happened (required): The closest description, or 'I am not sure'." />
        <GuideItem text="Noticed missing (optional): When you realised the animal was gone, if later." />
        <GuideItem text="Travelled towards (optional): Where it went, if you saw it. Otherwise choose Unknown." />
        <GuideItem text="Other details (optional): Only observed facts that may help the search." />
      </View>
      <View style={styles.fields}>
        <DateTimeField label="When was the animal last seen? (required)" dateValue={details.date} timeValue={details.time} onChange={(date, time) => updateDateTime('date', 'time', date, time)} errors={[errors.date, errors.time]} disabled={busy} />
        <ChoiceSection label="How certain is the time?" options={[["exact", "Exact"], ["approximate", "Approximate"]]} selected={details.timeAccuracy} onSelect={(value) => update('timeAccuracy', value)} error={errors.timeAccuracy} disabled={busy} />
        <ChoiceSection label="What happened?" options={MISSING_CIRCUMSTANCES} selected={details.circumstance} onSelect={(value) => update('circumstance', value)} error={errors.circumstance} disabled={busy} />
        {details.circumstance === 'suspected_stolen' ? <View style={styles.safetyNotice}><MaterialCommunityIcons name="shield-alert-outline" size={24} color={colors.missingOnTint} /><Text style={styles.safetyText}>If you suspect theft, please contact SAPS directly. Homeward Paws does not contact police or verify criminal reports.</Text></View> : null}
        <ChoiceSection label="Travelled towards (optional)" options={[["known", "Known"], ["unknown", "Unknown"]]} selected={details.travelDirection} onSelect={updateTravelDirection} disabled={busy} />
        {details.travelDirection === 'known' ? (
          <View style={styles.travelDetails}>
            <FormField label="What did you see?" value={details.direction} onChangeText={(value) => update('direction', value)} placeholder="Towards the station; with a person or vehicle, if seen" multiline maxLength={800} error={errors.direction} editable={!busy} />
            <Text style={styles.travelHint}>Only include a person or vehicle you actually saw with the animal. Do not guess or accuse anyone.</Text>
          </View>
        ) : null}
        <DateTimeField label="When did you notice the animal was missing? (optional)" dateValue={details.absenceNoticedDate} timeValue={details.absenceNoticedTime} onChange={(date, time) => updateDateTime('absenceNoticedDate', 'absenceNoticedTime', date, time)} errors={[errors.absenceNoticedDate, errors.absenceNoticedTime]} optional disabled={busy} />
        <FormField label="Other details (optional)" value={details.explanation} onChangeText={(value) => update('explanation', value)} placeholder="Anything else that may help" multiline maxLength={1000} editable={!busy} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {savedMessage ? <Text style={styles.saved}>{savedMessage}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => save({ finishStep: true })} style={[styles.saveButton, busy && styles.disabled]}>
        <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save and continue to location'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => save()} style={styles.textButton}>
        <Text style={styles.link}>Save incomplete draft for later</Text>
      </Pressable>
      <Text style={styles.footer}>This is not published. Location is next; contact choices and final review follow.</Text>
    </ScreenContainer>
  );
}

function GuideItem({ text }) {
  return <Text style={styles.guideItem}>{'\u2022'} {text}</Text>;
}

function ChoiceSection({ label, options, selected, onSelect, error, disabled }) {
  return (
    <View style={styles.choiceSection}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choices}>
        {options.map(([value, text]) => (
          <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected: value === selected, disabled }} disabled={disabled} onPress={() => onSelect(value)} style={[styles.choice, value === selected && styles.selectedChoice]}>
            <Text style={[styles.choiceText, value === selected && styles.selectedText]}>{text}</Text>
          </Pressable>
        ))}
      </View>
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.caption, color: colors.missingOnTint, marginBottom: spacing.sm },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  guide: { gap: spacing.sm, padding: spacing.lg, marginBottom: spacing.xxl, backgroundColor: colors.primaryLight, borderRadius: radii.md },
  guideTitle: { ...typography.bodyStrong, color: colors.primaryDark },
  guideItem: { ...typography.caption, color: colors.textPrimary, lineHeight: 21 },
  fields: { gap: spacing.lg },
  travelDetails: { gap: spacing.xs },
  travelHint: { ...typography.caption, color: colors.textSecondary },
  choiceSection: { gap: spacing.sm },
  fieldLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface },
  selectedChoice: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  choiceText: { ...typography.body, color: colors.textSecondary },
  selectedText: { ...typography.bodyStrong, color: colors.primaryDark },
  fieldError: { ...typography.caption, color: colors.error },
  safetyNotice: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.missingTint },
  safetyText: { ...typography.body, color: colors.missingOnTint, flex: 1 },
  saveButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, marginTop: spacing.xxl },
  saveText: { ...typography.button, color: colors.textOnPrimary },
  disabled: { opacity: 0.55 },
  textButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  link: { ...typography.button, color: colors.primary },
  footer: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, marginTop: spacing.md },
  saved: { ...typography.bodyStrong, color: colors.primaryDark, marginTop: spacing.md }
});
