import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS } from '../../config/animals';
import { MISSING_BROWSE_ENABLED } from '../../config/checkpoint3';
import { useSession } from '../../context/SessionContext';
import { listMyAnimals } from '../../services/animalService';
import { countNewMissingSightings } from '../../services/linkedSightingService';
import { deleteMissingDraft, listMyActiveMissingReports, listMyMissingDrafts, listMyResolvedMissingReports } from '../../services/missingReportService';
import { colors, radii, shadows, spacing, typography } from '../../theme';

function savedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Saved privately'
    : `Saved ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

function endedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Report ended'
    : `Ended ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function MyReportsScreen({ navigation }) {
  const { session } = useSession();
  const ownerId = session?.user?.id;
  const [drafts, setDrafts] = useState([]);
  const [activeReports, setActiveReports] = useState([]);
  const [resolvedReports, setResolvedReports] = useState([]);
  const [newSightingCounts, setNewSightingCounts] = useState({});
  const [animalsById, setAnimalsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showPastCases, setShowPastCases] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [draftRows, animalRows, activeRows, resolvedRows] = await Promise.all([
        listMyMissingDrafts(ownerId), listMyAnimals({ ownerId }),
        MISSING_BROWSE_ENABLED ? listMyActiveMissingReports(ownerId) : Promise.resolve([]),
        MISSING_BROWSE_ENABLED ? listMyResolvedMissingReports(ownerId) : Promise.resolve([])
      ]);
      setDrafts(draftRows);
      setAnimalsById(Object.fromEntries(animalRows.map((animal) => [animal.id, animal])));
      setActiveReports(activeRows);
      setResolvedReports(resolvedRows);
      setNewSightingCounts(MISSING_BROWSE_ENABLED
        ? await countNewMissingSightings(activeRows.map((report) => report.id)) : {});
    } catch (loadError) {
      setError(`We couldn't load your reports. Check your connection and try again. ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function openReportFlow(screen, params) {
    navigation.getParent()?.navigate('Report', { screen, params });
  }

  function confirmDelete(draft) {
    if (deletingId) return;
    const name = animalsById[draft.animal_id]?.name ?? 'this animal';
    Alert.alert('Delete private draft?', `The unfinished missing report for ${name} will be removed. The animal profile will stay.`, [
      { text: 'Keep draft', style: 'cancel' },
      {
        text: 'Delete draft',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(draft.id);
          setError('');
          setNotice('');
          try {
            await deleteMissingDraft(draft.id);
            setDrafts((current) => current.filter((item) => item.id !== draft.id));
            setNotice('Private draft deleted.');
          } catch (deleteError) {
            setError(`The draft was not deleted. Check your connection and try again. ${deleteError.message}`);
          } finally {
            setDeletingId(null);
          }
        }
      }
    ]);
  }

  return (
    <ScreenContainer>
      <Text style={styles.title}>My Reports</Text>
      <Text style={styles.subtitle}>{MISSING_BROWSE_ENABLED ? 'Review active cases and continue private drafts.' : 'Continue an unfinished missing report here. Drafts are visible only to you and have not been published.'}</Text>

      {loading ? <Text style={styles.message}>Loading your private drafts…</Text> : null}
      {error ? <View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={40} color={colors.error} /><Text style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /></View> : null}
      {notice && !error ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}

      {!loading && !error && drafts.length === 0 && activeReports.length === 0 && resolvedReports.length === 0 ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.stateTitle}>No report drafts yet</Text>
          <Text style={styles.message}>Start a missing report for one of your registered animals. You can save it and come back later.</Text>
        </View>
      ) : null}

      {!loading && !error && activeReports.length ? <Text style={styles.groupTitle}>Active missing reports</Text> : null}
      {!loading && !error ? activeReports.map((report) => {
        const animal = animalsById[report.animal_id];
        const newCount = newSightingCounts[report.id] ?? 0;
        return <View key={report.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Image source={animal?.photoUrl ? { uri: animal.photoUrl } : (ANIMAL_PLACEHOLDERS[animal?.category] ?? ANIMAL_PLACEHOLDERS.other)} style={styles.photo} />
            <View style={styles.cardBody}>
              <Text style={styles.name}>{animal?.name ?? 'Missing animal'}</Text>
              <Text style={styles.activeLabel}><MaterialCommunityIcons name="alert-circle-outline" size={15} /> MISSING · {report.public_reference}</Text>
              <Text style={styles.date}>{newCount ? `${newCount} new sighting${newCount === 1 ? '' : 's'} to review` : 'No new sightings to review'}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('OwnerMissingTimeline', { reportId: report.id, reference: report.public_reference })} style={styles.continueButton}><Text style={styles.continueText}>Case timeline and updates</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('OwnerMissingSightings', { reportId: report.id, reference: report.public_reference })} style={styles.continueButton}><Text style={styles.continueText}>Review sightings</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('ConfirmMissingReunion', { reportId: report.id, reference: report.public_reference })} style={styles.reunionButton}><MaterialCommunityIcons name="home-heart" size={20} color={colors.reunitedOnTint} /><Text style={styles.reunionText}>Confirm reunion</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('CloseMissingReport', { reportId: report.id, reference: report.public_reference })} style={styles.continueButton}><Text style={styles.continueText}>Close alert without reunion</Text></Pressable>
        </View>;
      }) : null}

      {!loading && !error && resolvedReports.length ? <Pressable accessibilityRole="button" accessibilityState={{ expanded: showPastCases }} onPress={() => setShowPastCases((shown) => !shown)} style={styles.pastToggle}><MaterialCommunityIcons name={showPastCases ? 'folder-open-outline' : 'folder-outline'} size={23} color={colors.primary} /><Text style={styles.pastToggleText}>{showPastCases ? 'Hide' : 'View'} past case files ({resolvedReports.length})</Text><MaterialCommunityIcons name={showPastCases ? 'chevron-up' : 'chevron-down'} size={23} color={colors.primary} /></Pressable> : null}
      {!loading && !error && showPastCases ? resolvedReports.map((report) => {
        const animal = animalsById[report.animal_id];
        const reunited = report.status === 'reunited';
        return <View key={report.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Image source={animal?.photoUrl ? { uri: animal.photoUrl } : (ANIMAL_PLACEHOLDERS[animal?.category] ?? ANIMAL_PLACEHOLDERS.other)} style={styles.photo} />
            <View style={styles.cardBody}>
              <Text style={styles.name}>{animal?.name ?? 'Animal'}</Text>
              <Text style={reunited ? styles.reunitedLabel : styles.draftLabel}><MaterialCommunityIcons name={reunited ? 'home-heart' : 'folder-lock-outline'} size={15} /> {reunited ? 'REUNITED' : 'CLOSED CASE'} · {report.public_reference}</Text>
              <Text style={styles.date}>{endedDate(report.closed_at)}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => navigation.navigate('OwnerMissingTimeline', { reportId: report.id, reference: report.public_reference })} style={styles.continueButton}><Text style={styles.continueText}>View case history</Text></Pressable>
          {!reunited && animal?.status === 'missing' && !activeReports.some((active) => active.animal_id === report.animal_id) ? <Pressable accessibilityRole="button" onPress={() => openReportFlow('SelectMissingAnimal')} style={styles.continueButton}><Text style={styles.continueText}>Start a new reviewed alert</Text></Pressable> : null}
        </View>;
      }) : null}

      {!loading && !error && drafts.length ? <Text style={styles.groupTitle}>Private drafts</Text> : null}

      {!loading && !error ? drafts.map((draft) => {
        const animal = animalsById[draft.animal_id];
        const deleting = Boolean(deletingId);
        return (
          <View key={draft.id} style={styles.card}>
            <View style={styles.cardTop}>
              <Image source={animal?.photoUrl ? { uri: animal.photoUrl } : (ANIMAL_PLACEHOLDERS[animal?.category] ?? ANIMAL_PLACEHOLDERS.other)} style={styles.photo} />
              <View style={styles.cardBody}>
                <Text style={styles.name}>{animal?.name ?? 'Animal profile unavailable'}</Text>
                <Text style={styles.draftLabel}><MaterialCommunityIcons name="lock-outline" size={15} /> Private missing draft</Text>
                <Text style={styles.date}>{savedDate(draft.updated_at)}</Text>
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" accessibilityState={{ disabled: deleting || !animal }} disabled={deleting || !animal} onPress={() => openReportFlow('MissingAppearance', { animalId: draft.animal_id, reportId: draft.id })} style={styles.continueButton}>
                <Text style={styles.continueText}>Continue draft</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={`Delete draft for ${animal?.name ?? 'animal'}`} accessibilityState={{ disabled: deleting }} disabled={deleting} onPress={() => confirmDelete(draft)} style={styles.deleteButton}>
                <Text style={styles.deleteText}>{deletingId === draft.id ? 'Deleting…' : 'Delete'}</Text>
              </Pressable>
            </View>
          </View>
        );
      }) : null}

      {!loading && !error ? <View style={styles.start}><PrimaryButton label="Start a missing report" onPress={() => openReportFlow('SelectMissingAnimal')} /></View> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  stateTitle: { ...typography.sectionTitle, color: colors.textPrimary, textAlign: 'center' },
  groupTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: spacing.md },
  pastToggle: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  pastToggleText: { ...typography.bodyStrong, color: colors.primaryDark, flex: 1 },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
  notice: { ...typography.bodyStrong, color: colors.primaryDark, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, ...shadows.card },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  photo: { width: 72, height: 72, borderRadius: radii.md },
  cardBody: { flex: 1, gap: spacing.xs },
  name: { ...typography.cardTitle, color: colors.textPrimary },
  draftLabel: { ...typography.caption, color: colors.textSecondary },
  activeLabel: { ...typography.caption, color: colors.missingOnTint },
  date: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  continueButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm, backgroundColor: colors.primaryLight, borderRadius: radii.md },
  continueText: { ...typography.bodyStrong, color: colors.primaryDark },
  reunionButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.reunitedTint },
  reunionText: { ...typography.bodyStrong, color: colors.reunitedOnTint },
  reunitedLabel: { ...typography.caption, color: colors.reunitedOnTint },
  deleteButton: { minWidth: 72, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteText: { ...typography.bodyStrong, color: colors.error },
  start: { marginTop: spacing.lg }
});
