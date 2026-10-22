import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS, animalCategoryLabel } from '../../config/animals';
import { listMyAnimals } from '../../services/animalService';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const emptyIllustration = require('../../../assets/illustrations/no-animals.png');

export function MyAnimalsScreen({ navigation, route }) {
  const archived = route.params?.archived === true;
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setAnimals(await listMyAnimals({ archived })); }
    catch (loadError) { setError(`We couldn't load your animals. ${loadError.message}`); }
    finally { setLoading(false); }
  }, [archived]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <ScreenContainer>
      <Text style={styles.title}>{archived ? 'Archived Animals' : 'My Animals'}</Text>
      <Text style={styles.subtitle}>{archived ? 'Restore an archived profile whenever it is needed again.' : 'Keep permanent profiles ready so a missing report can be created quickly.'}</Text>
      {loading ? <Text style={styles.message}>Loading your animals…</Text> : null}
      {!loading && error ? <View style={styles.state}><MaterialCommunityIcons name="cloud-alert-outline" size={48} color={colors.error} /><Text style={styles.error}>{error}</Text><PrimaryButton label="Try again" onPress={load} /></View> : null}
      {!loading && !error && animals.length === 0 ? <View style={styles.state}><Image source={emptyIllustration} style={styles.emptyImage} resizeMode="contain" /><Text style={styles.stateTitle}>{archived ? 'No archived animals' : 'No animals registered yet'}</Text><Text style={styles.message}>{archived ? 'Profiles you archive will appear here.' : 'Add an animal profile now so important details and photographs are ready when needed.'}</Text></View> : null}
      {!loading && !error ? <View style={styles.list}>{animals.map((animal) => <Pressable key={animal.id} onPress={() => navigation.navigate('AnimalDetail', { animalId: animal.id })} style={styles.card}><Image source={animal.photoUrl ? { uri: animal.photoUrl } : ANIMAL_PLACEHOLDERS[animal.category]} style={styles.photo} /><View style={styles.cardBody}><Text style={styles.name}>{animal.name}</Text><Text style={styles.meta}>{[animalCategoryLabel(animal.category), animal.breed].filter(Boolean).join(' · ')}</Text><View style={styles.status}><MaterialCommunityIcons name={archived ? 'archive-outline' : 'home-heart'} size={16} color={colors.reunitedOnTint} /><Text style={styles.statusText}>{archived ? 'ARCHIVED' : 'SAFE'}</Text></View></View><MaterialCommunityIcons name="chevron-right" size={24} color={colors.textSecondary} /></Pressable>)}</View> : null}
      {!loading && !error ? <View style={styles.action}>{archived ? null : <PrimaryButton label="Add animal" onPress={() => navigation.navigate('RegisterAnimal')} />}<Pressable onPress={() => navigation.navigate(archived ? 'MyAnimals' : 'ArchivedAnimals')} style={styles.archiveLink}><MaterialCommunityIcons name={archived ? 'paw-outline' : 'archive-outline'} size={20} color={colors.primary} /><Text style={styles.archiveLinkText}>{archived ? 'Back to active animals' : 'View archived animals'}</Text></Pressable></View> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyImage: { width: 240, height: 180 },
  stateTitle: { ...typography.sectionTitle, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.body, color: colors.error, textAlign: 'center' },
  list: { gap: spacing.md },
  card: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, ...shadows.card },
  photo: { width: 82, height: 82, borderRadius: radii.md },
  cardBody: { flex: 1, gap: spacing.xs },
  name: { ...typography.sectionTitle, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill, backgroundColor: colors.reunitedTint },
  statusText: { ...typography.caption, color: colors.reunitedOnTint },
  action: { gap: spacing.md, marginTop: spacing.xxl },
  archiveLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  archiveLinkText: { ...typography.button, color: colors.primary }
});
