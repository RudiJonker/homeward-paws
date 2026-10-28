import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect, usePreventRemove } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppDialog } from '../../components/AppDialog';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormField } from '../../components/forms/FormField';
import { SOUTH_AFRICAN_PROVINCES } from '../../config/constants';
import { useSession } from '../../context/SessionContext';
import { getMissingDraft, saveMissingDraft } from '../../services/missingReportService';
import { colors, radii, spacing, typography } from '../../theme';
import { deviceAccuracyMessage, suggestGeocodedArea } from '../../utils/geocodedArea';
import { blankMissingLocation, publicLocationPreview, restoreMissingLocationDraft, validateMissingLocation } from '../../utils/missingLocation';

const PRECISION_OPTIONS = [
  ['suburb', 'Suburb only', 'Shows only the suburb, city and province.'],
  ['approximate', 'Nearby street or landmark', 'Shows only the street or public landmark name and area, never a house number or exact map point.']
];

export function MissingLastSeenLocationScreen({ navigation, route }) {
  const { showDialog } = useAppDialog();
  const { animalId, reportId } = route.params;
  const { privateProfile } = useSession();
  const [place, setPlace] = useState(blankMissingLocation);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const loadedOnce = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);
    setError('');
    try {
      const draft = await getMissingDraft(reportId);
      if (draft.animal_id !== animalId || draft.draft_payload?.last_seen?.complete !== true) {
        throw new Error('Save the last-seen details before entering the location.');
      }
      setPlace(restoreMissingLocationDraft(draft.draft_payload?.last_seen_location));
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
    showDialog('Leave without saving?', 'Changes on this screen will be lost. Your last saved private draft will remain.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  function update(field, value, clearDevicePoint = false) {
    setPlace((current) => ({
      ...current,
      [field]: value,
      ...(clearDevicePoint ? { method: 'manual', latitude: null, longitude: null, accuracyMetres: null } : {})
    }));
    setErrors((current) => ({ ...current, [field]: undefined, method: undefined, ...(field === 'publicPrecision' ? { streetOrLandmark: undefined } : {}) }));
    setError('');
    setDirty(true);
    setSavedMessage('');
    setMessage(clearDevicePoint && place.method === 'device'
      ? 'Area edited. The previous device map point was cleared so it cannot point to the wrong place.'
      : '');
  }

  function useHomeArea() {
    const province = privateProfile?.province;
    const city = privateProfile?.city;
    const suburb = privateProfile?.suburb;
    if (!province || !city || !suburb) {
      setError('Your home area is incomplete. Enter the last-seen area manually.');
      return;
    }
    showDialog('Use your home area?', 'Only the province, city and suburb will be copied. Your home address and coordinates will not be copied. Confirm this is where the animal was last seen.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Use area only', onPress: () => {
        setPlace({ ...blankMissingLocation, method: 'home_area', province, city, suburb });
        setErrors({});
        setError('');
        setMessage('Home area copied without your private home coordinates. Check the area before saving.');
        setDirty(true);
        setSavedMessage('');
      } }
    ]);
  }

  function confirmCurrentPlace() {
    showDialog('Are you at the last-seen place?', 'Use your device location only if you are physically where the animal was last seen. Otherwise enter the place manually.', [
      { text: 'Enter manually', style: 'cancel' },
      { text: 'Yes, use this place', onPress: captureCurrentPlace }
    ]);
  }

  async function captureCurrentPlace() {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('Finding your current place…');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setMessage('Location permission was not granted. Enter the last-seen place manually.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const [address] = await Location.reverseGeocodeAsync(position.coords);
      if (address?.isoCountryCode && address.isoCountryCode !== 'ZA') {
        throw new Error('The current place is outside South Africa. Enter the last-seen place manually.');
      }
      const area = suggestGeocodedArea(address);
      setPlace({
        ...blankMissingLocation,
        method: 'device',
        province: area.province,
        city: area.city,
        suburb: area.suburb,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMetres: position.coords.accuracy ?? null
      });
      setErrors({});
      setDirty(true);
      setSavedMessage('');
      setMessage(`${deviceAccuracyMessage(position.coords.accuracy)}${area.suburb ? 'Check the suggested suburb, city and province.' : 'Enter the suburb manually; the device could not name it.'} Public sharing is still set to suburb only.`);
    } catch (locationError) {
      setMessage('Could not find this place. Enter it manually instead.');
      setError(locationError.message);
    } finally {
      setBusy(false);
    }
  }

  async function save({ finishStep = false } = {}) {
    if (busy) return;
    const validation = validateMissingLocation(place);
    if (finishStep && !validation.valid) {
      setErrors(validation.errors);
      setError('Please correct the highlighted location details, or save an incomplete draft for later.');
      return;
    }
    setBusy(true);
    setError('');
    setSavedMessage('');
    try {
      const latestDraft = await getMissingDraft(reportId);
      if (latestDraft.animal_id !== animalId || latestDraft.draft_payload?.last_seen?.complete !== true) {
        throw new Error('This draft changed. Return to last-seen details and reopen the location step.');
      }
      await saveMissingDraft(animalId, {
        ...latestDraft.draft_payload,
        last_seen_location: { ...place, complete: finishStep && validation.valid }
      }, reportId);
      setDirty(false);
      setErrors({});
      const confirmation = finishStep
        ? 'Last-seen location saved privately. Next, choose safety and contact options. Nothing has been published.'
        : 'Incomplete location saved privately. You can return and finish it later.';
      setSavedMessage(confirmation);
      showDialog('Draft saved', confirmation, finishStep ? [
        { text: 'Continue', onPress: () => navigation.navigate('MissingSafetyContact', { animalId, reportId }) },
        { text: 'Keep editing', style: 'cancel' }
      ] : [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Back to Report', onPress: () => navigation.popTo('ReportMenu') }
      ]);
    } catch (saveError) {
      setError(`Your location was not saved. Check your connection and try again. ${saveError.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading last-seen location…</Text></ScreenContainer>;
  if (loadFailed) return <ScreenContainer><View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /><Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.textButton}><Text style={styles.link}>Back to last-seen details</Text></Pressable></View></ScreenContainer>;

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>PRIVATE MISSING-REPORT DRAFT · STEP 4</Text>
      <Text style={styles.title}>Where was the animal last seen?</Text>
      <Text style={styles.subtitle}>Enter the place of the last confirmed sighting. Your current place or home area may be different.</Text>

      <View style={styles.methods}>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={confirmCurrentPlace} style={styles.methodButton}>
          <MaterialCommunityIcons name="crosshairs-gps" size={24} color={colors.primary} />
          <Text style={styles.methodText}>Use my current place</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={useHomeArea} style={styles.methodButton}>
          <MaterialCommunityIcons name="home-map-marker" size={24} color={colors.primary} />
          <Text style={styles.methodText}>Use my home area only</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>Or enter the last-seen place below. Location access is optional.</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      <View style={styles.fields}>
        <Text style={styles.fieldLabel}>Province</Text>
        <View style={styles.provinces}>
          {SOUTH_AFRICAN_PROVINCES.map((province) => (
            <Pressable key={province} accessibilityRole="radio" accessibilityState={{ selected: province === place.province, disabled: busy }} disabled={busy} onPress={() => update('province', province, true)} style={[styles.province, province === place.province && styles.provinceSelected]}>
              <Text style={[styles.provinceText, province === place.province && styles.provinceTextSelected]}>{province}</Text>
            </Pressable>
          ))}
        </View>
        {errors.province ? <Text style={styles.fieldError}>{errors.province}</Text> : null}
        <FormField label="City or town" value={place.city} onChangeText={(value) => update('city', value, true)} error={errors.city} maxLength={100} editable={!busy} />
        <FormField label="Suburb or area" value={place.suburb} onChangeText={(value) => update('suburb', value, true)} error={errors.suburb} maxLength={100} editable={!busy} />
        <FormField label="Street or public landmark (optional)" value={place.streetOrLandmark} onChangeText={(value) => update('streetOrLandmark', value, place.method === 'home_area')} error={errors.streetOrLandmark} placeholder="For example, Main Road or near the library" maxLength={200} editable={!busy} />
        <Text style={styles.hint}>Do not enter a house number or private address. A street or public landmark name is required only if you choose to show it to others.</Text>
      </View>

      <View style={styles.privacySection}>
        <Text style={styles.sectionTitle}>What may people see when this report is published?</Text>
        <Text style={styles.hint}>Nothing is public yet. Choose the precision deliberately; you can review it again before publishing.</Text>
        {PRECISION_OPTIONS.map(([value, title, description]) => {
          const disabled = busy || (place.method === 'home_area' && value !== 'suburb');
          const selected = place.publicPrecision === value;
          return (
            <Pressable key={value} accessibilityRole="radio" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => update('publicPrecision', value)} style={[styles.precisionCard, selected && styles.precisionSelected, disabled && styles.disabled]}>
              <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={selected ? colors.primary : colors.textSecondary} />
              <View style={styles.precisionBody}><Text style={styles.precisionTitle}>{title}</Text><Text style={styles.precisionDescription}>{description}</Text></View>
            </Pressable>
          );
        })}
        {place.method === 'home_area' ? <Text style={styles.hint}>Home area can only be shared at suburb level. To use a different precision, enter the incident place manually.</Text> : null}
        {errors.publicPrecision ? <Text style={styles.fieldError}>{errors.publicPrecision}</Text> : null}
        {errors.method ? <Text style={styles.fieldError}>{errors.method}</Text> : null}
      </View>

      <View style={styles.preview}>
        <Text style={styles.previewTitle}>Public location preview</Text>
        <Text style={styles.previewText}>{publicLocationPreview(place)}</Text>
        <Text style={styles.hint}>This is a preview only. Device coordinates remain private and are never shown as a public map pin.</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {savedMessage ? <Text style={styles.saved}>{savedMessage}</Text> : null}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => save({ finishStep: true })} style={[styles.saveButton, busy && styles.disabled]}>
        <Text style={styles.saveText}>{busy ? 'Saving…' : 'Save last-seen location'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => save()} style={styles.textButton}>
        <Text style={styles.link}>Save incomplete draft for later</Text>
      </Pressable>
      <Text style={styles.footer}>This does not publish a report. Safety, contact choices and a final preview still come next.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.caption, color: colors.missingOnTint, marginBottom: spacing.sm },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  methods: { gap: spacing.sm },
  methodButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  methodText: { ...typography.bodyStrong, color: colors.primaryDark },
  fields: { gap: spacing.md, marginTop: spacing.xxl },
  fieldLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  provinces: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  province: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface },
  provinceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  provinceText: { ...typography.caption, color: colors.textSecondary },
  provinceTextSelected: { color: colors.primaryDark },
  privacySection: { gap: spacing.sm, marginTop: spacing.xxl },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  precisionCard: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface },
  precisionSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  precisionBody: { flex: 1, gap: spacing.xs },
  precisionTitle: { ...typography.bodyStrong, color: colors.textPrimary },
  precisionDescription: { ...typography.caption, color: colors.textSecondary },
  preview: { gap: spacing.sm, marginTop: spacing.xxl, padding: spacing.lg, borderRadius: radii.md, backgroundColor: colors.primaryLight },
  previewTitle: { ...typography.bodyStrong, color: colors.primaryDark },
  previewText: { ...typography.body, color: colors.textPrimary },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  fieldError: { ...typography.caption, color: colors.error },
  error: { ...typography.body, color: colors.error, marginTop: spacing.md },
  saved: { ...typography.bodyStrong, color: colors.primaryDark, marginTop: spacing.md },
  saveButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: radii.md, marginTop: spacing.xxl },
  saveText: { ...typography.button, color: colors.textOnPrimary },
  textButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', marginTop: spacing.sm },
  link: { ...typography.button, color: colors.primary },
  footer: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  disabled: { opacity: 0.55 }
});
