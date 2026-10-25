import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PlaceholderCard } from '../../components/PlaceholderCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { ANIMAL_PLACEHOLDERS } from '../../config/animals';
import { animalStatusAppearance } from '../../config/animalStatus';
import { MISSING_BROWSE_ENABLED } from '../../config/checkpoint3';
import { useSession } from '../../context/SessionContext';
import { routes } from '../../navigation/routes';
import { listMyAnimals } from '../../services/animalService';
import { countNewMissingSightings } from '../../services/linkedSightingService';
import { listMyActiveMissingReports } from '../../services/missingReportService';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const noAnimals = require('../../../assets/illustrations/no-animals.png');


export function HomeScreen({ navigation }) {
  const { session } = useSession();
  const ownerId = session?.user?.id;
  const [animals, setAnimals] = useState([]);
  const [animalsLoading, setAnimalsLoading] = useState(true);
  const [animalsError, setAnimalsError] = useState('');
  const [sightingAlerts, setSightingAlerts] = useState([]);
  const [sightingAlertsLoading, setSightingAlertsLoading] = useState(true);
  const [sightingAlertsError, setSightingAlertsError] = useState('');
  const [hasActiveMissingReport, setHasActiveMissingReport] = useState(false);
  const sightingRequest = useRef(0);
  const hasActiveReportRef = useRef(false);

  const loadAnimals = useCallback(async () => {
    setAnimalsLoading(true);
    setAnimalsError('');
    try {
      setAnimals(await listMyAnimals({ limit: 4, ownerId }));
    } catch {
      setAnimalsError('We could not load your animals. Check your connection and try again.');
    } finally {
      setAnimalsLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => { loadAnimals(); }, [loadAnimals]));

  const loadSightingAlerts = useCallback(async (showLoading = false) => {
    if (!MISSING_BROWSE_ENABLED) return;
    if (!ownerId) {
      setSightingAlertsError('Sign in to check your missing reports.');
      setSightingAlertsLoading(false);
      return;
    }
    const request = ++sightingRequest.current;
    if (showLoading) setSightingAlertsLoading(true);
    setSightingAlertsError('');
    try {
      const reports = await listMyActiveMissingReports(ownerId);
      const counts = await countNewMissingSightings(reports.map((report) => report.id));
      if (request !== sightingRequest.current) return;
      hasActiveReportRef.current = reports.length > 0;
      setHasActiveMissingReport(reports.length > 0);
      setSightingAlerts(reports.map((report) => ({
        ...report, newCount: counts[report.id] ?? 0
      })).filter((report) => report.newCount > 0));
    } catch {
      if (request !== sightingRequest.current) return;
      setSightingAlerts([]);
      setSightingAlertsError('Could not check for new sightings. Check your connection and try again.');
    } finally {
      if (request === sightingRequest.current) setSightingAlertsLoading(false);
    }
  }, [ownerId]);

  useFocusEffect(useCallback(() => {
    if (!MISSING_BROWSE_ENABLED) return undefined;
    loadSightingAlerts(true);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') loadSightingAlerts();
    });
    const interval = setInterval(() => {
      if (hasActiveReportRef.current && AppState.currentState === 'active') loadSightingAlerts();
    }, 60000);
    return () => {
      sightingRequest.current += 1;
      appState.remove();
      clearInterval(interval);
    };
  }, [loadSightingAlerts]));

  const openProfile = (screen, params) => navigation.navigate(routes.profile, { screen, params });

  return (
    <ScreenContainer>
      <Text style={styles.eyebrow}>YOUR AREA</Text>
      <Text style={styles.title}>Welcome to Homeward Paws</Text>
      <Text style={styles.subtitle}>Together, we can help animals find their way home.</Text>
      {MISSING_BROWSE_ENABLED ? <View style={styles.sightingArea}>
        {sightingAlertsLoading ? <Text style={styles.sectionMessage}>Checking your missing reports for new sightings…</Text> : null}
        {!sightingAlertsLoading && sightingAlertsError ? <View style={styles.alertState}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={24} color={colors.error} />
          <Text accessibilityRole="alert" style={styles.alertStateText}>{sightingAlertsError}</Text>
          <Pressable accessibilityRole="button" onPress={() => loadSightingAlerts(true)} style={styles.retry}><Text style={styles.viewAllText}>Try again</Text></Pressable>
        </View> : null}
        {!sightingAlertsLoading && !sightingAlertsError && sightingAlerts.length ? <View accessibilityLiveRegion="polite" style={styles.sightingCard}>
          <View style={styles.sightingHeading}><MaterialCommunityIcons name="eye-outline" size={23} color={colors.sightingOnTint} /><Text style={styles.sightingTitle}>New sightings to review</Text></View>
          <Text style={styles.sightingBody}>Someone has shared a private observation about your missing animal. Review it as a clue.</Text>
          {sightingAlerts.map((report) => <Pressable key={report.id} accessibilityRole="button" accessibilityLabel={`Review ${report.newCount} new sighting${report.newCount === 1 ? '' : 's'} for ${report.public_reference}`} onPress={() => openProfile('OwnerMissingSightings', { reportId: report.id, reference: report.public_reference })} style={styles.sightingLink}>
            <Text style={styles.sightingLinkText}>{report.public_reference} · {report.newCount} new sighting{report.newCount === 1 ? '' : 's'}</Text>
            <MaterialCommunityIcons name="chevron-right" size={24} color={colors.sightingOnTint} />
          </Pressable>)}
        </View> : null}
        {!sightingAlertsLoading && !sightingAlertsError && hasActiveMissingReport && sightingAlerts.length === 0 ? <View style={styles.alertState}>
          <MaterialCommunityIcons name="check-circle-outline" size={21} color={colors.primaryDark} />
          <Text style={styles.alertStateText}>No new sightings to review.</Text>
          <Pressable accessibilityRole="button" onPress={() => loadSightingAlerts(true)} style={styles.retry}><Text style={styles.viewAllText}>Check again</Text></Pressable>
        </View> : null}
      </View> : null}
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
            const status = animalStatusAppearance(animal.status);
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
  sightingArea: { marginBottom: spacing.lg },
  sightingCard: { padding: spacing.lg, gap: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.sightingTint },
  sightingHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sightingTitle: { ...typography.sectionTitle, color: colors.sightingOnTint, flex: 1 },
  sightingBody: { ...typography.body, color: colors.textPrimary },
  sightingLink: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface },
  sightingLinkText: { ...typography.bodyStrong, color: colors.sightingOnTint, flex: 1 },
  alertState: { minHeight: 56, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.surface },
  alertStateText: { ...typography.body, color: colors.textSecondary, flexGrow: 1, flexBasis: 180 },
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
