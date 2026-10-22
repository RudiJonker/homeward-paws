import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS } from '../../config/animals';
import { listMyAnimals } from '../../services/animalService';
import { deleteMissingDraft, listMyMissingDrafts } from '../../services/missingReportService';
import { colors, radii, shadows, spacing, typography } from '../../theme';

function savedDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Saved privately'
    : `Saved ${date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export function MyReportsScreen({ navigation }) {
  const [drafts, setDrafts] = useState([]);
  const [animalsById, setAnimalsById] = useState({});
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [draftRows, animalRows] = await Promise.all([listMyMissingDrafts(), listMyAnimals()]);
      setDrafts(draftRows);
      setAnimalsById(Object.fromEntries(animalRows.map((animal) => [animal.id, animal])));
    } catch (loadError) {
      setError(`We couldn't load your reports. Check your connection and try again. ${loadError.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

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
      <Text style={styles.subtitle}>Continue an unfinished missing report here. Drafts are visible only to you and have not been published.</Text>

      {loading ? <Text style={styles.message}>Loading your private drafts…</Text> : null}
      {error ? <View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={40} color={colors.error} /><Text style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /></View> : null}
      {notice && !error ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}

      {!loading && !error && drafts.length === 0 ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="file-document-outline" size={48} color={colors.textSecondary} />
          <Text style={styles.stateTitle}>No report drafts yet</Text>
          <Text style={styles.message}>Start a missing report for one of your registered animals. You can save it and come back later.</Text>
        </View>
      ) : null}

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
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
  notice: { ...typography.bodyStrong, color: colors.primaryDark, marginBottom: spacing.md },
  card: { padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, ...shadows.card },
  cardTop: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  photo: { width: 72, height: 72, borderRadius: radii.md },
  cardBody: { flex: 1, gap: spacing.xs },
  name: { ...typography.cardTitle, color: colors.textPrimary },
  draftLabel: { ...typography.caption, color: colors.textSecondary },
  date: { ...typography.caption, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  continueButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, borderRadius: radii.md },
  continueText: { ...typography.bodyStrong, color: colors.primaryDark },
  deleteButton: { minWidth: 72, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  deleteText: { ...typography.bodyStrong, color: colors.error },
  start: { marginTop: spacing.lg }
});
