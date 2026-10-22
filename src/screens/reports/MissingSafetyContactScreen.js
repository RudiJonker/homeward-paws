import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormField } from '../../components/forms/FormField';
import { useSession } from '../../context/SessionContext';
import { getMissingDraft, saveMissingDraft } from '../../services/missingReportService';
import { colors, radii, spacing, typography } from '../../theme';
import { APPROACH_OPTIONS, URGENCY_OPTIONS, blankMissingSafetyContact, restoreMissingSafetyContact, validateMissingSafetyContact } from '../../utils/missingSafetyContact';

function ChoiceRow({ label, checked, onPress, disabled = false, single = false }) {
  return (
    <Pressable accessibilityRole={single ? 'radio' : 'checkbox'} accessibilityState={{ checked, selected: single ? checked : undefined, disabled }} disabled={disabled} onPress={onPress} style={[styles.choice, disabled && styles.disabled]}>
      <MaterialCommunityIcons name={single ? checked ? 'radiobox-marked' : 'radiobox-blank' : checked ? 'checkbox-marked' : 'checkbox-blank-outline'} size={25} color={checked ? colors.primary : colors.textSecondary} />
      <Text style={styles.choiceLabel}>{label}</Text>
    </Pressable>
  );
}

export function MissingSafetyContactScreen({ navigation, route }) {
  const { animalId, reportId } = route.params;
  const { privateProfile } = useSession();
  const [values, setValues] = useState(blankMissingSafetyContact);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const loadedOnce = useRef(false);

  const hasMobile = Boolean(privateProfile?.mobile_e164);
  const hasWhatsapp = hasMobile && privateProfile?.whatsapp_enabled === true;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setError('');
    try {
      const draft = await getMissingDraft(reportId);
      if (draft.animal_id !== animalId || draft.draft_payload?.last_seen_location?.complete !== true) {
        throw new Error('Save the last-seen location before choosing safety and contact details.');
      }
      setValues(restoreMissingSafetyContact(draft.draft_payload?.safety_contact));
      setErrors({});
      setDirty(false);
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
    Alert.alert('Leave without saving?', 'Changes on this screen will be lost. Your last saved private draft will remain.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setDirty(true);
    setError('');
    setSavedMessage('');
  }

  function updateContact(field) {
    setValues((current) => ({ ...current, contact: { ...current.contact, [field]: !current.contact[field] } }));
    setErrors((current) => ({ ...current, contact: undefined, [field]: undefined }));
    setDirty(true);
    setError('');
    setSavedMessage('');
  }

  async function save({ finishStep = false } = {}) {
    if (busy) return;
    const validation = validateMissingSafetyContact(values, { hasMobile, hasWhatsapp });
    if (finishStep && !validation.valid) {
      setErrors(validation.errors);
      setError('Please correct the highlighted choices, or save an incomplete draft for later.');
      return;
    }
    setBusy(true);
    setError('');
    setSavedMessage('');
    try {
      const draft = await getMissingDraft(reportId);
      if (draft.animal_id !== animalId || draft.draft_payload?.last_seen_location?.complete !== true) {
        throw new Error('This draft changed. Return to last-seen location and reopen this step.');
      }
      await saveMissingDraft(animalId, {
        ...draft.draft_payload,
        safety_contact: { ...values, complete: finishStep && validation.valid }
      }, reportId);
      setDirty(false);
      setErrors({});
      const confirmation = finishStep
        ? 'Safety and contact choices saved privately. Next, review what could be public. Nothing has been published.'
        : 'Incomplete safety and contact choices saved privately. You can return to finish them later.';
      setSavedMessage(confirmation);
      Alert.alert('Draft saved', confirmation, finishStep ? [
        { text: 'Continue to review', onPress: () => navigation.navigate('MissingPreview', { animalId, reportId }) },
        { text: 'Keep editing', style: 'cancel' }
      ] : [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Back to Report', onPress: () => navigation.popTo('ReportMenu') }
      ]);
    } catch (saveError) {
      setError(`Your choices were not saved. Check your connection and try again. ${saveError.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading safety and contact choices…</Text></ScreenContainer>;
  if (loadFailed) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /><Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.textButton}><Text style={styles.link}>Back to last-seen location</Text></Pressable></View></ScreenContainer>;

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>PRIVATE MISSING-REPORT DRAFT · STEP 5</Text>
      <Text style={styles.title}>Help others respond safely</Text>
      <Text style={styles.subtitle}>Choose only what you know. You will check everything that could become public before publishing.</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Urgent needs</Text>
        <Text style={styles.hint}>Select any that apply. Leave all clear if none are known.</Text>
        {URGENCY_OPTIONS.map(([value, label]) => (
          <ChoiceRow key={value} label={label} checked={values.urgencyFlags.includes(value)} disabled={busy} onPress={() => update('urgencyFlags', values.urgencyFlags.includes(value) ? values.urgencyFlags.filter((flag) => flag !== value) : [...values.urgencyFlags, value])} />
        ))}
        {errors.urgencyFlags ? <Text style={styles.fieldError}>{errors.urgencyFlags}</Text> : null}
        <FormField label="Brief urgent note (optional)" value={values.urgencyNote} onChangeText={(value) => update('urgencyNote', value)} placeholder="Only details that may help someone respond" multiline maxLength={500} error={errors.urgencyNote} editable={!busy} />
        <Text style={styles.hint}>Do not include private medical records or your contact details here.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How should someone approach?</Text>
        <Text style={styles.hint}>Choose one main instruction. If unsure, say so.</Text>
        {APPROACH_OPTIONS.map(([value, label]) => (
          <ChoiceRow key={value} label={label} checked={values.approach === value} single disabled={busy} onPress={() => update('approach', value)} />
        ))}
        {errors.approach ? <Text style={styles.fieldError}>{errors.approach}</Text> : null}
        <ChoiceRow label="May bite, scratch or kick" checked={values.biteScratchKickRisk} disabled={busy} onPress={() => update('biteScratchKickRisk', !values.biteScratchKickRisk)} />
        <FormField label="Extra approach guidance (optional)" value={values.approachNote} onChangeText={(value) => update('approachNote', value)} placeholder="For example, responds to a familiar name" multiline maxLength={500} error={errors.approachNote} editable={!busy} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How may people contact you?</Text>
        <Text style={styles.hint}>At least one option is needed. Calls and WhatsApp are off unless you turn them on for this report.</Text>
        <ChoiceRow label="Structured in-app response" checked={values.contact.inApp} disabled={busy} onPress={() => updateContact('inApp')} />
        <ChoiceRow label="Phone call — show my profile number" checked={values.contact.phone} disabled={busy || (!hasMobile && !values.contact.phone)} onPress={() => updateContact('phone')} />
        <ChoiceRow label="WhatsApp — show my profile number" checked={values.contact.whatsapp} disabled={busy || (!hasWhatsapp && !values.contact.whatsapp)} onPress={() => updateContact('whatsapp')} />
        {!hasMobile ? <Text style={styles.hint}>Add a mobile number to your profile to offer calls or WhatsApp.</Text> : null}
        {hasMobile && !hasWhatsapp ? <Text style={styles.hint}>Enable WhatsApp for your profile number before offering WhatsApp on this report.</Text> : null}
        {errors.contact ? <Text style={styles.fieldError}>{errors.contact}</Text> : null}
        {errors.phone ? <Text style={styles.fieldError}>{errors.phone}</Text> : null}
        {errors.whatsapp ? <Text style={styles.fieldError}>{errors.whatsapp}</Text> : null}
        <Text style={styles.privacy}>Your number is not copied into this draft. It would appear on the published report only for channels you enable and confirm in the final preview.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {savedMessage ? <Text style={styles.saved}>{savedMessage}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => save({ finishStep: true })} style={[styles.saveButton, busy && styles.disabled]}>
        <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save safety and contact choices'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => save()} style={styles.textButton}>
        <Text style={styles.link}>Save incomplete draft for later</Text>
      </Pressable>
      <Text style={styles.footer}>This does not publish a report. You will review the proposed public details next.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.caption, color: colors.missingOnTint, marginBottom: spacing.sm },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  section: { gap: spacing.sm, marginTop: spacing.xxl },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary },
  choice: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  choiceLabel: { ...typography.body, color: colors.textPrimary, flex: 1 },
  privacy: { ...typography.body, color: colors.primaryDark, backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: radii.md },
  fieldError: { ...typography.caption, color: colors.error },
  message: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.body, color: colors.error, marginTop: spacing.md },
  saved: { ...typography.bodyStrong, color: colors.primaryDark, marginTop: spacing.md },
  saveButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, marginTop: spacing.xxl },
  saveText: { ...typography.button, color: colors.textOnPrimary, textAlign: 'center' },
  textButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  link: { ...typography.button, color: colors.primary },
  footer: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  disabled: { opacity: 0.55 }
});
