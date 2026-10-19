import { StyleSheet, Text, View } from 'react-native';

import { PlaceholderCard } from '../../components/PlaceholderCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, radii, spacing, typography } from '../../theme';

export function BrowseScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Browse</Text>
      <Text style={styles.subtitle}>Find public reports by status and area.</Text>
      <View style={styles.tabs}>
        {['Missing', 'Found', 'Sightings', 'Reunited'].map((label, index) => (
          <Text key={label} style={[styles.tab, index === 0 && styles.activeTab]}>{label}</Text>
        ))}
      </View>
      <PlaceholderCard icon="map-search-outline" title="Reports will appear here" body="Search, filters, list view and map view arrive with the reporting checkpoints." />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xxl },
  tab: { ...typography.caption, color: colors.textSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted },
  activeTab: { color: colors.primaryDark, backgroundColor: colors.primaryLight }
});
