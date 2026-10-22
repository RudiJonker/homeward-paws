import { StyleSheet, Text, View } from 'react-native';

import { PlaceholderCard } from '../../components/PlaceholderCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, spacing, typography } from '../../theme';

export function ReportMenuScreen({ navigation }) {
  return (
    <ScreenContainer>
      <Text style={styles.title}>Report an animal</Text>
      <Text style={styles.subtitle}>Choose the option that best describes the situation.</Text>
      <View style={styles.list}>
        <PlaceholderCard icon="alert-circle" title="My Animal Is Missing" body="For an animal you own or care for." tint={colors.missingTint} color={colors.missing} onPress={() => navigation.navigate('SelectMissingAnimal')} />
        <PlaceholderCard icon="shield-home" title="I Found an Animal" body="For an animal that is secured or in known care." tint={colors.foundTint} color={colors.found} />
        <PlaceholderCard icon="eye" title="I Saw an Animal" body="For an animal that is still loose or has moved on." tint={colors.sightingTint} color={colors.sighting} />
      </View>
      <Text style={styles.note}>Missing reports can be saved privately as drafts. Found and sighting reports are coming later.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  list: { gap: spacing.md },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xl, textAlign: 'center' }
});
