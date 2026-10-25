import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Image, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS, animalCategoryLabel } from '../../config/animals';
import { MISSING_BROWSE_ENABLED } from '../../config/checkpoint3';
import { useSession } from '../../context/SessionContext';
import { getPublicMissingOutcome, getPublicMissingReport } from '../../services/missingReportService';
import { colors, radii, spacing, typography } from '../../theme';

const approachLabels = {
  unknown: 'Approach with care',
  safe: 'Safe to approach',
  slowly: 'Approach slowly',
  do_not_chase: 'Do not chase',
  do_not_catch: 'Do not catch'
};

function Detail({ label, value }) {
  if (!value) return null;
  return <View style={styles.detail}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

export function MissingReportDetailScreen({ navigation, route }) {
  const { reportId } = route.params;
  const { session, setPendingSightingIntent, setPendingContentReportIntent } = useSession();
  const [report, setReport] = useState(null);
  const [outcome, setOutcome] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const next = await getPublicMissingReport(reportId);
      const ended = next ? null : await getPublicMissingOutcome({ reportId });
      if (currentRequest === requestId.current) {
        setReport(next);
        setOutcome(ended);
      }
    } catch {
      if (currentRequest === requestId.current) {
        setReport(null);
        setOutcome(null);
        setError('We could not load this report. Check your connection and try again.');
      }
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [reportId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]));

  async function share() {
    setActionError('');
    try {
      await Share.share({ message: `Homeward Paws missing-animal report ${report.public_reference}. Open the app and search for this reference to see the latest public details.` });
    } catch {
      setActionError('Sharing is unavailable right now. You can copy the report reference above.');
    }
  }

  async function openContact(url) {
    setActionError('');
    try {
      await Linking.openURL(url);
    } catch {
      setActionError('Could not open this contact option on your device.');
    }
  }

  async function openContentReport(photoPath = null) {
    const intent = { reportId, photoPath, reference: report.public_reference };
    setActionError('');
    if (session) {
      navigation.navigate('ReportMissingContent', intent);
      return;
    }
    try {
      await setPendingContentReportIntent(intent);
      navigation.navigate('Login');
    } catch {
      setActionError('Could not prepare sign-in. Please try again.');
    }
  }

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading public report…</Text></ScreenContainer>;
  if (outcome) return <ScreenContainer>
    <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={25} color={colors.textPrimary} /><Text style={styles.backText}>Browse</Text></Pressable>
    <View style={styles.state}>
      <MaterialCommunityIcons name={outcome.status === 'reunited' ? 'home-heart' : 'file-check-outline'} size={54} color={outcome.status === 'reunited' ? colors.reunited : colors.textSecondary} />
      <Text style={styles.title}>{outcome.status === 'reunited' ? 'Animal reunited' : 'Report no longer active'}</Text>
      <Text selectable style={styles.reference}>{outcome.public_reference}</Text>
      <Text style={styles.message}>{outcome.public_message}</Text>
      <Text style={styles.note}>Private reunion details and former contact options are not shown.</Text>
    </View>
  </ScreenContainer>;
  if (!report) return (
    <ScreenContainer>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={25} color={colors.textPrimary} /><Text style={styles.backText}>Browse</Text></Pressable>
      <View style={styles.state}>
        <MaterialCommunityIcons name={error ? 'cloud-alert-outline' : 'file-search-outline'} size={48} color={error ? colors.error : colors.primary} />
        <Text accessibilityRole={error ? 'alert' : undefined} style={styles.message}>{error || 'This report is no longer public.'}</Text>
        {error ? <PrimaryButton label="Try again" onPress={load} /> : null}
      </View>
    </ScreenContainer>
  );

  const animalDescription = [animalCategoryLabel(report.category), report.breed, report.distinctive_features].filter(Boolean).join(' · ');
  const timeline = Array.isArray(report.public_timeline) ? report.public_timeline : [];
  const whatsappDigits = report.whatsapp?.replace(/\D/g, '');

  return (
    <ScreenContainer>
      <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.back}><MaterialCommunityIcons name="arrow-left" size={25} color={colors.textPrimary} /><Text style={styles.backText}>Browse</Text></Pressable>
      <View style={styles.status}><MaterialCommunityIcons name="alert-circle-outline" size={18} color={colors.missingOnTint} /><Text style={styles.statusText}>MISSING</Text></View>
      <Text style={styles.title}>{report.animal_name || 'Missing animal'}</Text>
      <Text style={styles.subtitle}>{animalDescription}</Text>
      <Text style={styles.referenceLabel}>REPORT REFERENCE</Text>
      <Text selectable style={styles.reference}>{report.public_reference}</Text>

      <View style={styles.photos}>
        {report.photoItems?.length ? report.photoItems.map((photo, index) => <View key={photo.path} style={styles.photoItem}><Image source={{ uri: photo.url }} style={styles.photo} /><Pressable accessibilityRole="button" accessibilityLabel={`Report photo ${index + 1}`} onPress={() => openContentReport(photo.path)} style={styles.photoFlag}><MaterialCommunityIcons name="flag-outline" size={17} color={colors.primary} /><Text style={styles.photoFlagText}>Report photo</Text></Pressable></View>) : <Image source={ANIMAL_PLACEHOLDERS[report.category] ?? ANIMAL_PLACEHOLDERS.unsure} style={styles.photo} />}
      </View>
      {MISSING_BROWSE_ENABLED && session ? <View style={styles.contribution}><PrimaryButton label="I saw this animal" onPress={() => navigation.navigate('LinkedSighting', { reportId, animalName: report.animal_name, lastSeenAt: report.last_seen_at })} /></View> : null}
      {MISSING_BROWSE_ENABLED && !session ? <View style={styles.contribution}><PrimaryButton label="Sign in to send a sighting" onPress={async () => {
        try {
          await setPendingSightingIntent({ reportId, animalName: report.animal_name, lastSeenAt: report.last_seen_at });
          navigation.navigate('Login');
        } catch {
          setActionError('Could not prepare sign-in. Please try again.');
        }
      }} /></View> : null}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last seen</Text>
        <Detail label="When" value={[formatDate(report.last_seen_at), report.time_accuracy && `(${report.time_accuracy.toLowerCase()} time)`].filter(Boolean).join(' ')} />
        <Detail label="Public area" value={report.public_location} />
        <Detail label="What happened" value={report.circumstance} />
        <Detail label="Travelled towards" value={report.travelled_towards} />
        <Detail label="Other details" value={report.explanation} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Description and safety</Text>
        <Detail label="Collar or accessories" value={report.accessories} />
        <Detail label="Current appearance" value={report.current_appearance} />
        <Detail label="Approach advice" value={approachLabels[report.approach_code] ?? report.approach_code} />
        <Detail label="Risk" value={report.bite_scratch_kick_risk ? 'May bite, scratch or kick' : ''} />
        <Detail label="Urgent needs" value={report.urgency_flags?.join(', ')} />
        <Detail label="Urgent note" value={report.urgency_note} />
        <Detail label="Extra guidance" value={report.approach_note} />
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Contact</Text>
        <Detail label="Reported by" value={report.reporter_name} />
        {report.phone ? <PrimaryButton label={`Call ${report.phone}`} onPress={() => openContact(`tel:${report.phone}`)} /> : null}
        {whatsappDigits ? <Pressable accessibilityRole="button" onPress={() => openContact(`https://wa.me/${whatsappDigits}`)} style={styles.secondaryButton}><Text style={styles.link}>WhatsApp {report.whatsapp}</Text></Pressable> : null}
        {report.contact_in_app ? <Text style={styles.note}>Use “I saw this animal” above to send the owner a private, structured sighting. The owner reviews it in My Reports.</Text> : null}
      </View>
      {timeline.length ? <View style={styles.card}><Text style={styles.cardTitle}>Public timeline</Text>{timeline.map((event, index) => <View key={`${event.occurred_at}-${index}`} style={styles.timelineItem}><Text style={styles.detailLabel}>{formatDate(event.occurred_at)}</Text><Text style={styles.detailValue}>{event.message || event.event_type?.replace(/_/g, ' ')}</Text></View>)}</View> : null}
      <PrimaryButton label="Share report reference" onPress={share} />
      <Pressable accessibilityRole="button" onPress={() => openContentReport()} style={styles.reportConcern}><MaterialCommunityIcons name="flag-outline" size={21} color={colors.primary} /><Text style={styles.link}>{session ? 'Report a concern about this alert' : 'Sign in to report a concern'}</Text></Pressable>
      {actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError}</Text> : null}
      <Text style={styles.note}>This page shows only the reporter-approved public area. Do not enter private addresses or identifying information when sharing it.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', marginBottom: spacing.lg },
  backText: { ...typography.bodyStrong, color: colors.textPrimary },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.missingTint },
  statusText: { ...typography.bodyStrong, color: colors.missingOnTint },
  title: { ...typography.screenTitle, color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  referenceLabel: { ...typography.label, color: colors.textSecondary, marginTop: spacing.lg },
  reference: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: spacing.xs },
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xl },
  contribution: { marginTop: spacing.xl },
  photo: { width: 100, height: 100, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  photoItem: { alignItems: 'center', gap: spacing.xs },
  photoFlag: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  photoFlagText: { ...typography.caption, color: colors.primary },
  card: { gap: spacing.md, padding: spacing.lg, marginTop: spacing.xl, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  cardTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  detail: { gap: spacing.xs },
  detailLabel: { ...typography.label, color: colors.textSecondary },
  detailValue: { ...typography.body, color: colors.textPrimary },
  timelineItem: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  secondaryButton: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: radii.md },
  link: { ...typography.bodyStrong, color: colors.primary },
  reportConcern: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.lg },
  error: { ...typography.body, color: colors.error, marginTop: spacing.md },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  state: { alignItems: 'center', gap: spacing.lg, paddingVertical: spacing.xxl }
});
