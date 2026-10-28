import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { usePreventRemove } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppDialog } from '../../components/AppDialog';
import { ScreenContainer } from '../../components/ScreenContainer';
import { DateTimeField } from '../../components/forms/DateTimeField';
import { FormField } from '../../components/forms/FormField';
import { useSession } from '../../context/SessionContext';
import { attachLinkedSightingPhoto, chooseLinkedSightingPhoto, removeLinkedSightingPhoto, submitLinkedSighting } from '../../services/linkedSightingService';
import { colors, radii, spacing, typography } from '../../theme';
import { deviceAccuracyMessage, suggestGeocodedArea } from '../../utils/geocodedArea';
import { SIGHTING_CONDITIONS, SIGHTING_MOVEMENTS, blankLinkedSighting, validateLinkedSighting } from '../../utils/linkedSighting';

function Choice({ label, selected, onPress }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.choice, selected && styles.choiceSelected]}>
    <MaterialCommunityIcons name={selected ? 'radiobox-marked' : 'radiobox-blank'} size={21} color={selected ? colors.primary : colors.textSecondary} />
    <Text style={styles.choiceText}>{label}</Text>
  </Pressable>;
}

export function LinkedSightingScreen({ navigation, route }) {
  const { showDialog } = useAppDialog();
  const { reportId, animalName, lastSeenAt } = route.params;
  const { privateProfile, session } = useSession();
  const [values, setValues] = useState(blankLinkedSighting);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [suburbPointNeedsConfirmation, setSuburbPointNeedsConfirmation] = useState(false);
  const [suburbPointConfirmed, setSuburbPointConfirmed] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);
  const [savedSightingId, setSavedSightingId] = useState(null);
  const [photoUri, setPhotoUri] = useState(null);
  const requestKey = useRef(null);
  const submitting = useRef(false);

  usePreventRemove((dirty || (savedSightingId && photoUri)) && !submittedId, ({ data }) => {
    showDialog('Leave this sighting?', savedSightingId
      ? 'The sighting is saved, but its photo has not been attached. Leaving will discard this photo retry.'
      : 'Your unsent details will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => navigation.dispatch(data.action) }
    ]);
  });

  function update(field, value, clearPoint = false) {
    const correctingCapturedSuburb = field === 'suburb' && values.locationSource === 'device';
    const shouldClearPoint = clearPoint && !correctingCapturedSuburb;
    setValues((current) => ({
      ...current, [field]: value,
      ...(shouldClearPoint ? { locationSource: 'manual', latitude: null, longitude: null, accuracyMetres: null } : {})
    }));
    setErrors((current) => ({ ...current, [field]: undefined, location: undefined }));
    setDirty(true);
    setError('');
    if (correctingCapturedSuburb) {
      setSuburbPointNeedsConfirmation(true);
      setSuburbPointConfirmed(false);
      setMessage('Suburb name corrected. Confirm below that it matches your captured device point.');
    } else if (shouldClearPoint && values.locationSource === 'device') {
      setSuburbPointNeedsConfirmation(false);
      setSuburbPointConfirmed(false);
      setMessage('Area changed. The previous exact device point was cleared so it cannot point to the wrong place.');
    }
  }

  function confirmCurrentPlace() {
    showDialog('Share this exact place with the owner?', 'Only the missing-report owner and authorised administrators can see the device point. Public Browse will not show it. Use this only if you are where you saw the animal.', [
      { text: 'Enter area manually', style: 'cancel' },
      { text: 'Use my current place', onPress: captureCurrentPlace }
    ]);
  }

  async function captureCurrentPlace() {
    if (busy) return;
    setBusy(true);
    setMessage('Finding your current place…');
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setMessage('Location permission was not granted. Enter the observation area manually.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      let address = null;
      try { [address] = await Location.reverseGeocodeAsync(position.coords); } catch { /* Manual area fields remain available. */ }
      if (address?.isoCountryCode && address.isoCountryCode !== 'ZA') {
        throw new Error('This place is outside South Africa. Enter the observation area manually.');
      }
      const area = suggestGeocodedArea(address);
      setSuburbPointNeedsConfirmation(false);
      setSuburbPointConfirmed(false);
      setValues((current) => ({
        ...current, locationSource: 'device',
        latitude: position.coords.latitude, longitude: position.coords.longitude,
        accuracyMetres: position.coords.accuracy ?? null,
        province: area.province,
        city: area.city,
        suburb: area.suburb
      }));
      setErrors({});
      setDirty(true);
      setMessage(`${deviceAccuracyMessage(position.coords.accuracy)}Device point saved privately for the missing-report owner. ${area.suburb ? 'Check the area fields before sending.' : 'Enter the suburb manually; the device could not name it.'}`);
    } catch (locationError) {
      setMessage('Could not capture this place. Enter the area manually instead.');
      setError(locationError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (submitting.current || submittedId || savedSightingId) return;
    if (suburbPointNeedsConfirmation && !suburbPointConfirmed) {
      setError('Confirm that your corrected suburb matches the captured device point before sending.');
      return;
    }
    const checked = validateLinkedSighting(values, lastSeenAt);
    if (!checked.valid) {
      setErrors(checked.errors);
      setError('Please correct the highlighted details before sending.');
      return;
    }
    submitting.current = true;
    if (!requestKey.current) requestKey.current = `sighting-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    setBusy(true);
    setError('');
    let persistedSightingId = null;
    try {
      const sightingId = await submitLinkedSighting(reportId, checked.payload, requestKey.current);
      persistedSightingId = sightingId;
      setSavedSightingId(sightingId);
      setDirty(false);
      if (photoUri) await attachLinkedSightingPhoto(sightingId, session.user.id, photoUri);
      setSubmittedId(sightingId);
    } catch (submitError) {
      setError(persistedSightingId
        ? `The sighting was saved, but its photo could not be attached. Try the photo again or finish without it. ${submitError.message}`
        : `We could not confirm that this sighting was sent. Your entries are still here. Check your connection and try again. ${submitError.message}`);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  async function pickPhoto() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const uri = await chooseLinkedSightingPhoto();
      if (uri) { setPhotoUri(uri); setDirty(true); }
    } catch {
      setError('Could not prepare that photo. Please choose another one or send without a photo.');
    } finally { setBusy(false); }
  }

  async function retryPhoto() {
    if (busy || !savedSightingId || !photoUri) return;
    setBusy(true);
    setError('');
    try {
      await attachLinkedSightingPhoto(savedSightingId, session.user.id, photoUri);
      setSubmittedId(savedSightingId);
    } catch (photoError) {
      setError(`The sighting is saved, but the photo is still pending. Check your connection and try again. ${photoError.message}`);
    } finally { setBusy(false); }
  }

  async function finishWithoutPhoto() {
    if (busy || !savedSightingId) return;
    setBusy(true);
    setError('');
    try {
      await removeLinkedSightingPhoto(savedSightingId, `${session.user.id}/${savedSightingId}/sighting.jpg`);
      setPhotoUri(null);
      setSubmittedId(savedSightingId);
    } catch {
      setError('Could not discard the unfinished photo. Check your connection and try again. Your sighting is already saved.');
    } finally { setBusy(false); }
  }

  if (submittedId) return <ScreenContainer>
    <View style={styles.successIcon}><MaterialCommunityIcons name="check-circle-outline" size={44} color={colors.primaryDark} /></View>
    <Text style={styles.title}>Sighting sent to the owner</Text>
    <Text style={styles.body}>Thank you. The missing-report owner can review this observation{photoUri ? ' and photo' : ''} privately. It is not a public comment or proof that this is the same animal.</Text>
    <PrimaryButton label="Back to missing report" onPress={() => navigation.goBack()} />
  </ScreenContainer>;

  if (savedSightingId) return <ScreenContainer>
    <View style={styles.successIcon}><MaterialCommunityIcons name="check-circle-outline" size={44} color={colors.primaryDark} /></View>
    <Text style={styles.title}>Sighting saved</Text>
    <Text style={styles.body}>The owner can already see your sighting. The optional photo has not been attached yet.</Text>
    {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel="Selected sighting photo" /> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <PrimaryButton label={busy ? 'Attaching photo…' : 'Try photo again'} disabled={busy} onPress={retryPhoto} />
    <Pressable accessibilityRole="button" disabled={busy} onPress={finishWithoutPhoto} style={styles.secondaryButton}><Text style={styles.link}>Finish without photo</Text></Pressable>
  </ScreenContainer>;

  return <ScreenContainer>
    <Text style={styles.eyebrow}>PRIVATE CASE RESPONSE</Text>
    <Text style={styles.title}>I saw {animalName || 'this animal'}</Text>
    <Text style={styles.body}>Tell the owner only what you observed. Do not follow the animal into danger or take a photo while driving.</Text>

    <Text style={styles.section}>When did you see the animal?</Text>
    <DateTimeField label="Observation date and time" dateValue={values.date} timeValue={values.time} onChange={(date, time) => { update('date', date); update('time', time); }} errors={[errors.date]} disabled={busy} />

    <Text style={styles.section}>Where did you see the animal?</Text>
    <Text style={styles.body}>Enter the place manually, or capture your current point if you are still there. An exact point is shown privately to the owner, never in public Browse.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={confirmCurrentPlace} style={styles.secondaryButton}><MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.primary} /><Text style={styles.link}>Use my current place</Text></Pressable>
    {message ? <Text style={styles.message}>{message}</Text> : null}
    {errors.location ? <Text style={styles.error}>{errors.location}</Text> : null}
    <FormField label="Province" value={values.province} onChangeText={(value) => update('province', value, true)} error={errors.province} autoCapitalize="words" />
    <FormField label="City or town" value={values.city} onChangeText={(value) => update('city', value, true)} error={errors.city} autoCapitalize="words" />
    <FormField label="Suburb or area" value={values.suburb} onChangeText={(value) => update('suburb', value, true)} error={errors.suburb} autoCapitalize="words" />
    {suburbPointNeedsConfirmation && values.locationSource === 'device' ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: suburbPointConfirmed }} onPress={() => { setSuburbPointConfirmed((confirmed) => !confirmed); setError(''); }} style={styles.checkRow}><MaterialCommunityIcons name={suburbPointConfirmed ? 'checkbox-marked' : 'checkbox-blank-outline'} size={22} color={colors.primary} /><Text style={styles.choiceText}>The corrected suburb matches my captured device point</Text></Pressable> : null}
    <FormField label="Street or public landmark (optional, private)" value={values.streetOrLandmark} onChangeText={(value) => update('streetOrLandmark', value)} error={errors.streetOrLandmark} />

    <Text style={styles.section}>What was happening?</Text>
    <Text style={styles.label}>What was the animal doing?</Text>
    <View style={styles.choices}>{SIGHTING_MOVEMENTS.map(([code, label]) => <Choice key={code} label={label} selected={values.movement === code} onPress={() => update('movement', code)} />)}</View>
    {errors.movement ? <Text style={styles.error}>{errors.movement}</Text> : null}
    <Text style={styles.label}>How did the animal look?</Text>
    <View style={styles.choices}>{SIGHTING_CONDITIONS.map(([code, label]) => <Choice key={code} label={label} selected={values.condition === code} onPress={() => update('condition', code)} />)}</View>
    {errors.condition ? <Text style={styles.error}>{errors.condition}</Text> : null}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: values.stillVisible }} onPress={() => update('stillVisible', !values.stillVisible)} style={styles.checkRow}>
      <MaterialCommunityIcons name={values.stillVisible ? 'checkbox-marked' : 'checkbox-blank-outline'} size={25} color={colors.primary} />
      <Text style={styles.choiceText}>The animal is still visible</Text>
    </Pressable>
    <FormField label="Travelled towards (optional)" value={values.direction} onChangeText={(value) => update('direction', value)} error={errors.direction} placeholder="Direction or landmark, if known" />
    <FormField label="Other useful details (optional)" value={values.notes} onChangeText={(value) => update('notes', value)} error={errors.notes} multiline placeholder="Only what you saw; avoid guesses or private details" />

    <Text style={styles.section}>Photo (optional)</Text>
    <Text style={styles.body}>Add one photo only if it was safe to take. The photo is private to you, the missing-report owner and authorised administrators. Avoid private details in the image.</Text>
    {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} accessibilityLabel="Selected sighting photo" /> : null}
    <Pressable accessibilityRole="button" disabled={busy} onPress={pickPhoto} style={styles.secondaryButton}><MaterialCommunityIcons name="image-plus" size={22} color={colors.primary} /><Text style={styles.link}>{photoUri ? 'Choose a different photo' : 'Choose a photo'}</Text></Pressable>
    {photoUri ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => { setPhotoUri(null); setDirty(true); }} style={styles.removePhoto}><Text style={styles.link}>Remove selected photo</Text></Pressable> : null}

    {privateProfile?.mobile_e164 ? <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: values.sharePhone }} onPress={() => update('sharePhone', !values.sharePhone)} style={styles.checkRow}>
      <MaterialCommunityIcons name={values.sharePhone ? 'checkbox-marked' : 'checkbox-blank-outline'} size={25} color={colors.primary} />
      <Text style={styles.choiceText}>Let the owner see my saved phone number for this sighting</Text>
    </Pressable> : null}
    <Text style={styles.privacy}>Only this missing-report owner and authorised administrators can read your sighting. Your phone stays hidden unless you choose to share it above.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <PrimaryButton label={busy ? 'Sending sighting…' : 'Send sighting to owner'} disabled={busy} onPress={submit} />
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.caption, color: colors.sightingOnTint },
  title: { ...typography.screenTitle, color: colors.textPrimary, marginTop: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  section: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: spacing.xxl, marginBottom: spacing.md },
  label: { ...typography.bodyStrong, color: colors.textPrimary, marginTop: spacing.md },
  choices: { gap: spacing.sm },
  choice: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  choiceText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  checkRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  secondaryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md, marginVertical: spacing.md },
  link: { ...typography.bodyStrong, color: colors.primary },
  message: { ...typography.body, color: colors.primaryDark, marginBottom: spacing.md },
  error: { ...typography.caption, color: colors.error, marginVertical: spacing.sm },
  privacy: { ...typography.caption, color: colors.textSecondary, marginVertical: spacing.xl },
  successIcon: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: radii.circle, backgroundColor: colors.primaryLight },
  photo: { width: 150, height: 150, borderRadius: radii.md, marginTop: spacing.md },
  removePhoto: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
