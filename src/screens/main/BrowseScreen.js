import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { FormField } from '../../components/forms/FormField';
import { ANIMAL_CATEGORIES, ANIMAL_PLACEHOLDERS, animalCategoryLabel } from '../../config/animals';
import { MISSING_BROWSE_ENABLED } from '../../config/checkpoint3';
import { SOUTH_AFRICAN_PROVINCES } from '../../config/constants';
import { getPublicMissingOutcome, listPublicMissingReports } from '../../services/missingReportService';
import { colors, radii, shadows, spacing, typography } from '../../theme';

const PAGE_SIZE = 20;
const EMPTY_FILTERS = { province: '', city: '', suburb: '', category: '' };

function MissingCard({ report, onPress }) {
  const area = [report.suburb, report.city, report.province].filter(Boolean).join(', ');
  const description = [animalCategoryLabel(report.category), report.breed].filter(Boolean).join(' · ');

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`View missing report ${report.public_reference}`} onPress={onPress} style={styles.card}>
      <Image source={report.photoUrls?.[0] ? { uri: report.photoUrls[0] } : ANIMAL_PLACEHOLDERS[report.category] ?? ANIMAL_PLACEHOLDERS.unsure} style={styles.photo} />
      <View style={styles.cardBody}>
        <Text style={styles.animalName} numberOfLines={1}>{report.animal_name || 'Missing animal'}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
        <Text style={styles.area} numberOfLines={2}>{area || 'Area not available'}</Text>
        <View style={styles.status}>
          <MaterialCommunityIcons name="alert-circle-outline" size={15} color={colors.missingOnTint} />
          <Text style={styles.statusText}>MISSING</Text>
        </View>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
    </Pressable>
  );
}

export function BrowseScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [endedResult, setEndedResult] = useState(null);
  const [referenceInput, setReferenceInput] = useState('');
  const [reference, setReference] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [draftFilters, setDraftFilters] = useState(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const loadedQuery = useRef('');
  const scrollRef = useRef(null);

  const load = useCallback(async ({ offset = 0, search = reference, selectedFilters = filters, preserve = false } = {}) => {
    const currentRequest = ++requestId.current;
    const queryKey = JSON.stringify({ search, selectedFilters });
    if (offset) setLoadingMore(true);
    else {
      setLoading(true);
      if (!preserve || loadedQuery.current !== queryKey) {
        setReports([]);
        setEndedResult(null);
      }
    }
    setError('');
    try {
      const next = await listPublicMissingReports({ limit: PAGE_SIZE, offset, reference: search, ...selectedFilters });
      const ended = search && !offset && next.length === 0
        ? await getPublicMissingOutcome({ reference: search }) : null;
      if (currentRequest !== requestId.current) return;
      setReports((existing) => offset ? [...existing, ...next] : next);
      loadedQuery.current = queryKey;
      if (!offset) setEndedResult(ended);
      setHasMore(next.length === PAGE_SIZE);
    } catch {
      if (currentRequest === requestId.current) setError('We could not load public reports. Check your connection and try again.');
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [reference, filters]);

  useFocusEffect(useCallback(() => {
    if (MISSING_BROWSE_ENABLED) load({ preserve: true });
    return () => { requestId.current += 1; };
  }, [load]));

  function search() {
    const next = referenceInput.trim().toUpperCase();
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    if (next === reference) load({ search: next });
    else setReference(next);
  }

  function updateDraftFilter(key, value) {
    setDraftFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    const next = {
      province: draftFilters.province,
      city: draftFilters.city.trim(),
      suburb: draftFilters.suburb.trim(),
      category: draftFilters.category
    };
    const unchanged = Object.keys(next).every((key) => next[key] === filters[key]);
    setDraftFilters(next);
    setFilters(next);
    setFiltersOpen(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    if (reference) {
      setReference('');
      setReferenceInput('');
    } else if (unchanged) load({ search: '', selectedFilters: next });
  }

  function clearFilters() {
    setDraftFilters(EMPTY_FILTERS);
    setFilters(EMPTY_FILTERS);
    setFiltersOpen(false);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    if (!Object.values(filters).some(Boolean) && !reference) load({ search: '', selectedFilters: EMPTY_FILTERS });
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <ScreenContainer scrollRef={scrollRef}>
      <Text style={styles.title}>Browse</Text>
      <Text style={styles.subtitle}>Find public missing-animal reports. Private drafts never appear here.</Text>
      <View style={styles.tabs}>
        <View style={[styles.tab, styles.activeTab]}><Text style={styles.activeTabText}>Missing</Text></View>
        {['Found', 'Sightings', 'Reunited'].map((label) => <View key={label} style={styles.tab}><Text style={styles.tabText}>{label}</Text></View>)}
      </View>
      {!MISSING_BROWSE_ENABLED ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="map-search-outline" size={48} color={colors.primary} />
          <Text style={styles.emptyTitle}>Public missing reports are coming soon</Text>
          <Text style={styles.message}>Browse will open after publishing and safe responses are connected. Your private drafts stay private.</Text>
        </View>
      ) : null}
      {MISSING_BROWSE_ENABLED ? <>
      <Text style={styles.searchLabel}>Search by report reference</Text>
      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Report reference"
          autoCapitalize="characters"
          autoCorrect={false}
          onChangeText={setReferenceInput}
          onSubmitEditing={search}
          placeholder="Enter a report reference"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          style={styles.searchInput}
          value={referenceInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Search reports" onPress={search} style={styles.searchButton}>
          <MaterialCommunityIcons name="magnify" size={25} color={colors.textOnPrimary} />
        </Pressable>
      </View>
      {reference ? <Pressable accessibilityRole="button" onPress={() => { setReferenceInput(''); setReference(''); }} style={styles.clearButton}><Text style={styles.link}>Clear reference search</Text></Pressable> : null}
      {reference ? <Text style={styles.filterHint}>Area filters are paused while searching by reference.</Text> : null}

      <Pressable accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }} onPress={() => { setDraftFilters(filters); setFiltersOpen((open) => !open); }} style={styles.filterToggle}><MaterialCommunityIcons name="filter-variant" size={22} color={colors.primary} /><Text style={styles.link}>{filtersOpen ? 'Hide filters' : hasFilters ? 'Edit filters' : 'Filter by area or animal type'}</Text><MaterialCommunityIcons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.primary} /></Pressable>
      {hasFilters && !filtersOpen ? <View style={styles.activeFilters}><Text style={styles.filterHint}>Showing {[
        filters.category && animalCategoryLabel(filters.category), filters.suburb, filters.city, filters.province
      ].filter(Boolean).join(' · ')}</Text><Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearButton}><Text style={styles.link}>Clear filters</Text></Pressable></View> : null}
      {filtersOpen ? <View style={styles.filterPanel}>
        <Text style={styles.filterTitle}>Search public areas</Text>
        <Text style={styles.filterHint}>Choose a province, then enter a full city or suburb name if you know it. Only the public area shown on each report is searched.</Text>
        <Text style={styles.filterLabel}>Province</Text>
        <View style={styles.chips}>{['', ...SOUTH_AFRICAN_PROVINCES].map((province) => <Pressable key={province || 'all'} accessibilityRole="radio" accessibilityState={{ selected: draftFilters.province === province }} onPress={() => updateDraftFilter('province', province)} style={[styles.chip, draftFilters.province === province && styles.chipSelected]}><Text style={[styles.chipText, draftFilters.province === province && styles.chipTextSelected]}>{province || 'All provinces'}</Text></Pressable>)}</View>
        <FormField label="City or town (optional)" value={draftFilters.city} onChangeText={(value) => updateDraftFilter('city', value)} maxLength={120} autoCapitalize="words" placeholder="e.g. Johannesburg" />
        <FormField label="Suburb (optional)" value={draftFilters.suburb} onChangeText={(value) => updateDraftFilter('suburb', value)} maxLength={120} autoCapitalize="words" placeholder="e.g. Melville" />
        <Text style={styles.filterLabel}>Animal type</Text>
        <View style={styles.chips}>{[{ value: '', label: 'All animals' }, ...ANIMAL_CATEGORIES].map((category) => <Pressable key={category.value || 'all'} accessibilityRole="radio" accessibilityState={{ selected: draftFilters.category === category.value }} onPress={() => updateDraftFilter('category', category.value)} style={[styles.chip, draftFilters.category === category.value && styles.chipSelected]}><Text style={[styles.chipText, draftFilters.category === category.value && styles.chipTextSelected]}>{category.label}</Text></Pressable>)}</View>
        <PrimaryButton label="Show matching reports" onPress={applyFilters} />
        <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.clearButton}><Text style={styles.link}>Clear all filters</Text></Pressable>
      </View> : null}

      {loading ? <Text style={styles.message}>{reports.length ? 'Refreshing public reports…' : 'Loading public reports…'}</Text> : null}
      {!loading && error && reports.length === 0 ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="cloud-alert-outline" size={42} color={colors.error} />
          <Text accessibilityRole="alert" style={styles.message}>{error}</Text>
          <PrimaryButton label="Try again" onPress={() => load()} />
        </View>
      ) : null}
      {!loading && !error && endedResult ? <Pressable accessibilityRole="button" accessibilityLabel={`View ended report ${endedResult.public_reference}`} onPress={() => navigation.navigate('MissingReportDetail', { reportId: endedResult.report_id })} style={styles.card}>
        <MaterialCommunityIcons name={endedResult.status === 'reunited' ? 'home-heart' : 'file-check-outline'} size={32} color={endedResult.status === 'reunited' ? colors.reunitedOnTint : colors.textSecondary} />
        <View style={styles.cardBody}><Text style={styles.animalName}>{endedResult.status === 'reunited' ? 'Animal reunited' : 'Report no longer active'}</Text><Text style={styles.description}>{endedResult.public_reference}</Text><Text style={styles.area}>{endedResult.public_message}</Text></View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />
      </Pressable> : null}
      {!loading && !error && reports.length === 0 && !endedResult ? (
        <View style={styles.state}>
          <MaterialCommunityIcons name="map-search-outline" size={48} color={colors.primary} />
          <Text style={styles.emptyTitle}>{reference ? 'No report matches this reference' : hasFilters ? 'No reports match these filters' : 'No public missing reports yet'}</Text>
          <Text style={styles.message}>{reference ? 'Check the reference and try again.' : hasFilters ? 'Try a wider area or another animal type.' : 'New missing-animal reports will appear here when published.'}</Text>
        </View>
      ) : null}
      {reports.length ? (
        <View style={styles.list}>
          <Text style={styles.sectionTitle}>{reference ? 'Matching report' : hasFilters ? 'Matching missing reports' : 'Recent missing reports'}</Text>
          {reports.map((report) => <MissingCard key={report.report_id} report={report} onPress={() => navigation.navigate('MissingReportDetail', { reportId: report.report_id })} />)}
          {error ? <Text accessibilityRole="alert" style={styles.message}>{error}</Text> : null}
          {hasMore ? <PrimaryButton label={loadingMore ? 'Loading…' : 'Load more'} disabled={loadingMore} onPress={() => load({ offset: reports.length })} /> : null}
          <Pressable accessibilityRole="button" onPress={() => load()} style={styles.refresh}><Text style={styles.link}>Refresh reports</Text></Pressable>
        </View>
      ) : null}
      </> : null}
      <Text style={styles.footer}>Found, Sightings and Reunited browsing will arrive in the next checkpoint.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xl },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  tab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  activeTab: { backgroundColor: colors.missingTint },
  tabText: { ...typography.caption, color: colors.textSecondary },
  activeTabText: { ...typography.bodyStrong, color: colors.missingOnTint },
  searchLabel: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.xs },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  searchInput: { ...typography.body, flex: 1, minHeight: 50, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, backgroundColor: colors.surface, color: colors.textPrimary },
  searchButton: { width: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.primary },
  clearButton: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  filterToggle: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  filterPanel: { gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface },
  filterTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  filterLabel: { ...typography.bodyStrong, color: colors.textPrimary },
  filterHint: { ...typography.caption, color: colors.textSecondary },
  activeFilters: { marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill, backgroundColor: colors.surface },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  chipText: { ...typography.body, color: colors.textPrimary },
  chipTextSelected: { ...typography.bodyStrong, color: colors.primaryDark },
  link: { ...typography.bodyStrong, color: colors.primary },
  state: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.sectionTitle, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
  list: { gap: spacing.md, marginTop: spacing.xl },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, ...shadows.card },
  photo: { width: 88, height: 88, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
  cardBody: { flex: 1, gap: 3 },
  animalName: { ...typography.sectionTitle, color: colors.textPrimary },
  description: { ...typography.caption, color: colors.textSecondary },
  area: { ...typography.caption, color: colors.textPrimary },
  status: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radii.pill, backgroundColor: colors.missingTint },
  statusText: { ...typography.caption, color: colors.missingOnTint },
  refresh: { minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  footer: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xxl }
});
