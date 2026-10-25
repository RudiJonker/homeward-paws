import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { listOwnerMissingSightings, reviewLinkedSighting } from '../../services/linkedSightingService';
import { colors, radii, spacing, typography } from '../../theme';
import { SIGHTING_CONDITIONS, SIGHTING_MOVEMENTS } from '../../utils/linkedSighting';

const REVIEW_OPTIONS = [
  ['likely', 'Likely this animal'], ['possible', 'Possibly this animal'],
  ['unlikely', 'Unlikely'], ['not_animal', 'Not this animal'],
  ['needs_more_information', 'Need more information']
];

function labelFor(options, value) {
  return options.find(([code]) => code === value)?.[1] ?? value;
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

function Detail({ label, value, selectable = false }) {
  if (value == null || value === '') return null;
  return <View style={styles.detail}><Text style={styles.label}>{label}</Text><Text selectable={selectable} style={styles.value}>{value}</Text></View>;
}

function SightingPhoto({ url }) {
  const [failed, setFailed] = useState(false);
  return failed || !url
    ? <Text style={styles.privateNote}>Photo unavailable. Refresh sightings to try again.</Text>
    : <Image source={{ uri: url }} style={styles.sightingPhoto} onError={() => setFailed(true)} accessibilityLabel="Private sighting photo" />;
}

export function OwnerMissingSightingsScreen({ route }) {
  const { reportId, reference } = route.params;
  const [sightings, setSightings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const next = await listOwnerMissingSightings(reportId);
      if (currentRequest === requestId.current) setSightings(next);
    } catch {
      if (currentRequest === requestId.current) setError('Could not load sightings. Check your connection and try again.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [reportId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]));

  async function review(sighting, decision) {
    if (busyId) return;
    setBusyId(sighting.id);
    setError('');
    setNotice('');
    try {
      await reviewLinkedSighting(sighting.id, decision);
      setSightings((current) => current.map((row) => row.id === sighting.id ? { ...row, review_status: decision } : row));
      setNotice('Your assessment was saved. A sighting is a clue, not proof of identity.');
    } catch {
      setError('Could not save your assessment. Check your connection and try again.');
    } finally {
      setBusyId(null);
    }
  }

  async function callContributor(phone) {
    setError('');
    try { await Linking.openURL(`tel:${phone}`); }
    catch { setError('Could not open the phone app on this device.'); }
  }

  return <ScreenContainer>
    <Text style={styles.title}>Sightings for your report</Text>
    <Text style={styles.subtitle}>Reference {reference}. These observations are private to you, each contributor and authorised administrators. Review them as clues; only people can confirm identity.</Text>
    {loading ? <Text style={styles.message}>Loading sightings…</Text> : null}
    {error ? <View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={42} color={colors.error} /><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /></View> : null}
    {notice && !error ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
    {!loading && !error && sightings.length === 0 ? <View style={styles.state}>
      <MaterialCommunityIcons name="eye-outline" size={48} color={colors.sighting} />
      <Text style={styles.section}>No sightings yet</Text>
      <Text style={styles.message}>When someone sends a linked sighting, it will appear here for your review.</Text>
    </View> : null}
    {!loading && sightings.map((sighting) => <View key={sighting.id} style={styles.card}>
      <View style={styles.cardHeader}><MaterialCommunityIcons name="eye-outline" size={22} color={colors.sightingOnTint} /><Text style={styles.cardTitle}>Observed {formatDate(sighting.observed_at)}</Text></View>
      <View style={styles.reviewChip}><Text style={styles.reviewText}>{sighting.review_status === 'new' ? 'NEW · NEEDS REVIEW' : labelFor(REVIEW_OPTIONS, sighting.review_status)}</Text></View>
      <Detail label="Area" value={[sighting.street_or_landmark, sighting.suburb, sighting.city, sighting.province].filter(Boolean).join(', ')} />
      {sighting.private_latitude != null && sighting.private_longitude != null ? <Detail label="Private exact point (latitude, longitude)" value={`${sighting.private_latitude}, ${sighting.private_longitude}${sighting.accuracy_m != null ? ` · within about ${Math.round(sighting.accuracy_m)} m` : ''}`} selectable /> : null}
      <Detail label="Movement" value={labelFor(SIGHTING_MOVEMENTS, sighting.movement)} />
      <Detail label="Travelled towards" value={sighting.direction} />
      <Detail label="Condition observed" value={labelFor(SIGHTING_CONDITIONS, sighting.observed_condition)} />
      <Detail label="Still visible when reported" value={sighting.still_visible ? 'Yes' : 'No'} />
      <Detail label="Other details" value={sighting.notes} />
      {sighting.photo_path ? <View style={styles.detail}><Text style={styles.label}>Private photo</Text><SightingPhoto url={sighting.photoUrl} /></View> : null}
      {sighting.contact_phone_e164 ? <Pressable accessibilityRole="button" onPress={() => callContributor(sighting.contact_phone_e164)} style={styles.contactButton}><MaterialCommunityIcons name="phone-outline" size={20} color={colors.primary} /><Text style={styles.contactText}>Call contributor: {sighting.contact_phone_e164}</Text></Pressable> : <Text style={styles.privateNote}>The contributor did not share a phone number for this sighting.</Text>}
      <Text style={styles.reviewHeading}>Your assessment</Text>
      <View style={styles.reviewOptions}>{REVIEW_OPTIONS.map(([code, label]) => <Pressable key={code} accessibilityRole="button" accessibilityState={{ selected: sighting.review_status === code, disabled: busyId === sighting.id }} disabled={busyId === sighting.id} onPress={() => review(sighting, code)} style={[styles.reviewButton, sighting.review_status === code && styles.reviewSelected]}><Text style={[styles.reviewButtonText, sighting.review_status === code && styles.reviewSelectedText]}>{label}</Text></Pressable>)}</View>
    </View>)}
    {!loading && sightings.length ? <Pressable accessibilityRole="button" onPress={load} style={styles.refresh}><Text style={styles.link}>Refresh sightings</Text></Pressable> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, marginBottom: spacing.xl },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
  notice: { ...typography.bodyStrong, color: colors.primaryDark, marginBottom: spacing.md },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  section: { ...typography.sectionTitle, color: colors.textPrimary },
  card: { gap: spacing.md, padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardTitle: { ...typography.sectionTitle, color: colors.textPrimary, flex: 1 },
  reviewChip: { alignSelf: 'flex-start', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.sightingTint },
  reviewText: { ...typography.caption, color: colors.sightingOnTint },
  detail: { gap: spacing.xs },
  label: { ...typography.label, color: colors.textSecondary },
  value: { ...typography.body, color: colors.textPrimary },
  contactButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contactText: { ...typography.bodyStrong, color: colors.primary },
  privateNote: { ...typography.caption, color: colors.textSecondary },
  reviewHeading: { ...typography.bodyStrong, color: colors.textPrimary },
  reviewOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  reviewButton: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill },
  reviewSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  reviewButtonText: { ...typography.caption, color: colors.textPrimary },
  reviewSelectedText: { color: colors.primaryDark },
  refresh: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  sightingPhoto: { width: '100%', height: 220, borderRadius: radii.md },
  link: { ...typography.bodyStrong, color: colors.primary }
});
