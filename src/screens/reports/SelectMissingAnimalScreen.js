import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS, animalCategoryLabel } from '../../config/animals';
import { useSession } from '../../context/SessionContext';
import { listMyAnimals } from '../../services/animalService';
import { listMyActiveMissingReports, listMyMissingDrafts, listMyResolvedMissingReports, saveMissingDraft } from '../../services/missingReportService';
import { colors, radii, shadows, spacing, typography } from '../../theme';

export function SelectMissingAnimalScreen({ navigation }) {
  const { session } = useSession();
  const ownerId = session?.user?.id;
  const [animals, setAnimals] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [activeReports, setActiveReports] = useState([]);
  const [closedReports, setClosedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyAnimalId, setBusyAnimalId] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [animalRows, draftRows, activeRows, resolvedRows] = await Promise.all([
        listMyAnimals({ ownerId }), listMyMissingDrafts(ownerId),
        listMyActiveMissingReports(ownerId), listMyResolvedMissingReports(ownerId)
      ]);
      setAnimals(animalRows);
      setDrafts(draftRows);
      setActiveReports(activeRows);
      setClosedReports(resolvedRows.filter((report) => report.status === 'closed'));
    } catch (loadError) {
      setError(`We couldn't load your animals or drafts. Check your connection and try again. ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function selectAnimal(animal) {
    if (busyAnimalId) return;
    const existingDraft = drafts.find((draft) => draft.animal_id === animal.id);
    setBusyAnimalId(animal.id);
    setError('');
    try {
      // Recheck immediately before creation so an older selection view does
      // not replace a draft saved elsewhere with an empty payload.
      const latestDraft = existingDraft ?? (await listMyMissingDrafts(ownerId)).find((draft) => draft.animal_id === animal.id);
      const reportId = latestDraft?.id ?? await saveMissingDraft(animal.id, {});
      navigation.navigate('MissingAppearance', { animalId: animal.id, reportId });
    } catch (saveError) {
      setError(`The missing report could not be opened. ${saveError.message}`);
    } finally {
      setBusyAnimalId(null);
    }
  }

  const canStartReport = (animal) => !activeReports.some((report) => report.animal_id === animal.id)
    && (animal.status === 'safe' || (
      animal.status === 'missing'
      && closedReports.some((report) => report.animal_id === animal.id)
    ));
  const eligibleAnimals = animals.filter(canStartReport);
  const unavailableAnimals = animals.filter((animal) => !canStartReport(animal));

  return (
    <ScreenContainer>
      <Text style={styles.title}>Who is missing?</Text>
      <Text style={styles.subtitle}>Choose a registered animal. Your report stays private until you review and publish it.</Text>
      {loading ? <Text style={styles.message}>Loading your animals and drafts…</Text> : null}
      {error ? <View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={40} color={colors.error} /><Text style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /></View> : null}
      {!loading && !error && eligibleAnimals.length === 0 ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="paw-off-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.stateTitle}>No animals available for a new alert</Text>
          <Text style={styles.message}>Register an animal in My Animals, or return here after closing an older missing alert. An animal with an active alert cannot start another.</Text>
          <PrimaryButton label="Go to My Animals" onPress={() => navigation.getParent()?.navigate('Profile', { screen: 'MyAnimals' })} />
        </View>
      ) : null}
      {!loading && !error ? (
        <View style={styles.list}>
          {eligibleAnimals.map((animal) => {
            const draft = drafts.find((item) => item.animal_id === animal.id);
            const busy = Boolean(busyAnimalId);
            return (
              <Pressable key={animal.id} accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => selectAnimal(animal)} style={styles.card}>
                <Image source={animal.photoUrl ? { uri: animal.photoUrl } : ANIMAL_PLACEHOLDERS[animal.category]} style={styles.photo} />
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{animal.name}</Text>
                  <Text style={styles.meta}>{[animalCategoryLabel(animal.category), animal.breed].filter(Boolean).join(' · ')}</Text>
                  <Text style={styles.actionText}>{busyAnimalId === animal.id ? 'Opening…' : draft ? 'Continue private draft' : animal.status === 'missing' ? 'Start a new reviewed alert' : 'Start missing report'}</Text>
                  {animal.status === 'missing' && !draft ? <Text style={styles.meta}>Previous case details will not be copied.</Text> : null}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </Pressable>
            );
          })}
          {unavailableAnimals.length ? <Text style={styles.message}>Animals with an active alert, or another unavailable status, cannot start a new alert.</Text> : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  list: { gap: spacing.md },
  card: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card },
  photo: { width: 82, height: 82, borderRadius: radii.md },
  cardBody: { flex: 1, gap: spacing.xs },
  name: { ...typography.sectionTitle, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary },
  actionText: { ...typography.bodyStrong, color: colors.missingOnTint },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  stateTitle: { ...typography.sectionTitle, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, textAlign: 'center' }
});
