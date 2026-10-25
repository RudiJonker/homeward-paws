import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { missingClosureReasonLabel } from '../../config/missingClosureReasons';
import { getOwnerMissingTimeline } from '../../services/missingOwnerUpdateService';
import { getMyMissingClosure, getMyMissingReportStatus } from '../../services/missingReportService';
import { colors, radii, spacing, typography } from '../../theme';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' });
}

export function OwnerMissingTimelineScreen({ navigation, route }) {
  const { reportId, reference } = route.params;
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState(null);
  const [closure, setClosure] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const [next, report, savedClosure] = await Promise.all([
        getOwnerMissingTimeline(reportId), getMyMissingReportStatus(reportId),
        getMyMissingClosure(reportId)
      ]);
      if (currentRequest === requestId.current) {
        setEvents(next);
        setStatus(report.status);
        setClosure(savedClosure);
      }
    } catch {
      if (currentRequest === requestId.current) setError('Could not load this case. Check your connection and try again.');
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, [reportId]);

  useFocusEffect(useCallback(() => {
    load();
    return () => { requestId.current += 1; };
  }, [load]));

  return <ScreenContainer>
    <Text style={styles.title}>Missing case timeline</Text>
    <Text style={styles.subtitle}>Reference {reference}. Public updates remain in the case history. Sighting activity is private to this case.</Text>
    {status && !loading && !error ? <View style={status === 'reunited' ? styles.reunitedStatus : status === 'active' ? styles.activeStatus : styles.closedStatus}><MaterialCommunityIcons name={status === 'reunited' ? 'home-heart' : status === 'active' ? 'alert-circle-outline' : 'file-check-outline'} size={18} color={status === 'reunited' ? colors.reunitedOnTint : status === 'active' ? colors.missingOnTint : colors.textSecondary} /><Text style={styles.statusText}>{status.toUpperCase()}</Text></View> : null}
    {!loading && !error && status === 'active' ? <PrimaryButton label="Add an update" onPress={() => navigation.navigate('AddMissingUpdate', { reportId, reference })} /> : null}
    {!loading && !error && status === 'active' ? <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ConfirmMissingReunion', { reportId, reference })} style={styles.reunionButton}><MaterialCommunityIcons name="home-heart" size={21} color={colors.reunitedOnTint} /><Text style={styles.reunionText}>Confirm reunion</Text></Pressable> : null}
    {!loading && !error && status === 'active' ? <Pressable accessibilityRole="button" onPress={() => navigation.navigate('CloseMissingReport', { reportId, reference })} style={styles.linkButton}><MaterialCommunityIcons name="folder-lock-outline" size={21} color={colors.primary} /><Text style={styles.link}>Close alert without reunion</Text></Pressable> : null}
    {!loading && !error && status === 'closed' ? <View style={styles.coldCase}><MaterialCommunityIcons name="folder-lock-outline" size={23} color={colors.textSecondary} /><View style={styles.coldCaseBody}><Text style={styles.coldCaseTitle}>Private closed case file</Text><Text style={styles.coldCaseText}>This report is no longer in public Browse. Closing did not confirm a reunion.</Text>{closure ? <><Text style={styles.coldCaseText}>Reason: {missingClosureReasonLabel(closure.reason_code)}</Text>{closure.private_note ? <Text style={styles.coldCaseText}>Your note: {closure.private_note}</Text> : null}<Text style={styles.coldCaseText}>{closure.animal_safe_confirmed ? 'You confirmed that the animal is safe.' : 'The animal remains marked MISSING.'}</Text></> : null}</View></View> : null}
    {!loading && !error && status === 'closed' ? <View style={styles.reopenSection}><Text style={styles.coldCaseText}>If the search continues, start a new private draft. Review current details before publishing; this case file stays closed.</Text><PrimaryButton label="Start a new reviewed alert" onPress={() => navigation.getParent()?.navigate('Report', { screen: 'SelectMissingAnimal' })} /></View> : null}
    <Pressable accessibilityRole="button" onPress={() => navigation.navigate('OwnerMissingSightings', { reportId, reference })} style={styles.linkButton}>
      <MaterialCommunityIcons name="eye-outline" size={21} color={colors.primary} />
      <Text style={styles.link}>Review private sightings</Text>
    </Pressable>
    {loading ? <Text style={styles.message}>Loading case history…</Text> : null}
    {error ? <View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={42} color={colors.error} /><Text accessibilityRole="alert" style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /></View> : null}
    {!loading && !error && events.length === 0 ? <View style={styles.state}><MaterialCommunityIcons name="timeline-clock-outline" size={48} color={colors.textSecondary} /><Text style={styles.message}>No case history yet. Your updates and sightings will appear here.</Text></View> : null}
    {!loading && !error ? events.map((event) => <View key={event.event_id} style={styles.event}>
      <MaterialCommunityIcons name={event.visibility === 'public' ? 'earth' : 'lock-outline'} size={21} color={event.visibility === 'public' ? colors.primary : colors.sighting} />
      <View style={styles.eventBody}>
        <Text style={styles.date}>{formatDate(event.occurred_at)} · {event.visibility === 'public' ? 'Public' : 'Private'}</Text>
        <Text style={styles.eventText}>{event.message || 'Case activity'}</Text>
      </View>
    </View>) : null}
    {!loading && events.length ? <Pressable accessibilityRole="button" onPress={load} style={styles.linkButton}><Text style={styles.link}>Refresh timeline</Text></Pressable> : null}
  </ScreenContainer>;
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  linkButton: { minHeight: 48, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  reunionButton: { minHeight: 48, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, backgroundColor: colors.reunitedTint, borderRadius: radii.md },
  reunionText: { ...typography.bodyStrong, color: colors.reunitedOnTint },
  coldCase: { flexDirection: 'row', gap: spacing.sm, padding: spacing.lg, marginBottom: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surfaceMuted },
  coldCaseBody: { flex: 1, gap: spacing.sm },
  coldCaseTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  coldCaseText: { ...typography.body, color: colors.textSecondary },
  reopenSection: { gap: spacing.sm, marginBottom: spacing.md },
  activeStatus: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md, padding: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.missingTint },
  reunitedStatus: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md, padding: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.reunitedTint },
  closedStatus: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md, padding: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  statusText: { ...typography.caption, color: colors.textPrimary },
  link: { ...typography.bodyStrong, color: colors.primary },
  message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.lg, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
  state: { gap: spacing.md, alignItems: 'center', paddingVertical: spacing.xxl },
  event: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  eventBody: { flex: 1, gap: spacing.xs },
  date: { ...typography.caption, color: colors.textSecondary },
  eventText: { ...typography.body, color: colors.textPrimary }
});
