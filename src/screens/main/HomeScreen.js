import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaceholderCard } from '../../components/PlaceholderCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS } from '../../config/animals';
import { routes } from '../../navigation/routes';
import { listMyAnimals } from '../../services/animalService';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const noAnimals = require('../../../assets/illustrations/no-animals.png');

const statusAppearance = {
  safe: { label: 'SAFE', icon: 'home-heart', tint: colors.reunitedTint, ink: colors.reunitedOnTint },
  missing: { label: 'MISSING', icon: 'alert-circle-outline', tint: colors.missingTint, ink: colors.missingOnTint },
  in_care: { label: 'IN CARE', icon: 'heart-outline', tint: colors.foundTint, ink: colors.foundOnTint },
  fostered: { label: 'FOSTERED', icon: 'home-outline', tint: colors.primaryLight, ink: colors.primaryDark },
  transferred: { label: 'TRANSFERRED', icon: 'swap-horizontal', tint: colors.primaryLight, ink: colors.primaryDark },
  deceased: { label: 'DECEASED', icon: 'heart-broken-outline', tint: colors.surfaceMuted, ink: colors.textSecondary }
};

export function HomeScreen({ navigation }) {
  const [animals, setAnimals] = useState([]);
  const [animalsLoading, setAnimalsLoading] = useState(true);
  const [animalsError, setAnimalsError] = useState('');

  const loadAnimals = useCallback(async () => {
    setAnimalsLoading(true);
    setAnimalsError('');
    try {
      setAnimals(await listMyAnimals({ limit: 4 }));
    } catch {
      setAnimalsError('We could not load your animals. Check your connection and try again.');
    } finally {
      setAnimalsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAnimals(); }, [loadAnimals]));

  const openProfile = (screen, params) => navigation.navigate(routes.profile, { screen, params });

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>YOUR AREA</Text>
      <Text style={styles.title}>Welcome to Homeward Paws</Text>
      <Text style={styles.subtitle}>Together, we can help animals find their way home.</Text>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Let’s bring them home</Text>
        <Text style={styles.heroBody}>Choose Report below whenever an animal is missing, found, or still roaming.</Text>
      </View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Animals</Text>
        <Pressable accessibilityRole="button" onPress={() => openProfile('MyAnimals')} style={styles.viewAll}><Text style={styles.viewAllText}>View all</Text></Pressable>
      </View>
      {animalsLoading ? <Text style={styles.sectionMessage}>Loading your animals…</Text> : null}
      {!animalsLoading && animalsError ? (
        <View style={styles.animalState}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={28} color={colors.error} />
          <Text style={styles.sectionMessage}>{animalsError}</Text>
          <Pressable accessibilityRole="button" onPress={loadAnimals} style={styles.retry}><Text style={styles.viewAllText}>Try again</Text></Pressable>
        </View>
      ) : null}
      {!animalsLoading && !animalsError && animals.length === 0 ? (
        <View style={styles.animalState}>
          <Image source={noAnimals} style={styles.emptyIllustration} resizeMode="contain" />
          <Text style={styles.emptyTitle}>No animals registered yet</Text>
          <Text style={styles.sectionMessage}>Add a profile so their details are ready if they ever go missing.</Text>
        </View>
      ) : null}
      {!animalsLoading && !animalsError ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.animalStrip}>
          {animals.map((animal) => {
            const status = statusAppearance[animal.status] ?? statusAppearance.safe;
            return (
              <Pressable key={animal.id} accessibilityRole="button" accessibilityLabel={`Open ${animal.name}'s animal profile`} onPress={() => openProfile('AnimalDetail', { animalId: animal.id })} style={styles.animalTile}>
                <Image source={animal.photoUrl ? { uri: animal.photoUrl } : ANIMAL_PLACEHOLDERS[animal.category]} style={styles.animalPhoto} />
                <Text style={styles.animalName} numberOfLines={1}>{animal.name}</Text>
                <View style={[styles.status, { backgroundColor: status.tint }]}>
                  <MaterialCommunityIcons name={status.icon} size={15} color={status.ink} />
                  <Text style={[styles.statusText, { color: status.ink }]}>{status.label}</Text>
                </View>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel="Add animal" onPress={() => openProfile('RegisterAnimal')} style={styles.addTile}>
            <MaterialCommunityIcons name="plus-circle-outline" size={36} color={colors.primary} />
            <Text style={styles.addText}>Add animal</Text>
          </Pressable>
        </ScrollView>
      ) : null}
      <Text style={styles.sectionTitle}>Nearby activity</Text>
      <PlaceholderCard icon="alert-circle" title="Missing near you" body="Local missing reports will appear here." tint={colors.missingTint} color={colors.missing} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  eyebrow: { ...typography.caption, color: colors.primary, marginBottom: spacing.xs },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  hero: { padding: spacing.xl, borderRadius: radii.xl, backgroundColor: colors.primaryLight, marginBottom: spacing.xxl },
  heroTitle: { ...typography.sectionTitle, color: colors.primaryDark, marginBottom: spacing.sm },
  heroBody: { ...typography.body, color: colors.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginBottom: spacing.md },
  viewAll: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  viewAllText: { ...typography.bodyStrong, color: colors.primary },
  sectionMessage: { ...typography.body, color: colors.textSecondary },
  animalState: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg },
  emptyIllustration: { width: 130, height: 95 },
  emptyTitle: { ...typography.cardTitle, color: colors.textPrimary },
  retry: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.lg },
  animalStrip: { gap: spacing.md, paddingBottom: spacing.md, paddingRight: spacing.md, marginBottom: spacing.xl },
  animalTile: { width: 136, minHeight: 173, alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, ...shadows.card },
  animalPhoto: { width: 94, height: 94, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  animalName: { ...typography.cardTitle, color: colors.textPrimary, alignSelf: 'stretch', textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radii.pill },
  statusText: { ...typography.caption },
  addTile: { width: 136, minHeight: 173, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.primary, borderRadius: radii.lg, backgroundColor: colors.primaryLight },
  addText: { ...typography.bodyStrong, color: colors.primaryDark, textAlign: 'center' }
});
