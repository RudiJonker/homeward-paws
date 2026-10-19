import { Image, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, spacing, typography } from '../../theme';
import { routes } from '../../navigation/routes';

const logo = require('../../../assets/brand/logo-horizontal.png');

export function WelcomeScreen({ navigation }) {
  return (
    <ScreenContainer contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel="Homeward Paws" />
        <Text style={styles.title}>Helping lost animals find their way home.</Text>
        <Text style={styles.body}>Report, share and follow missing, found and sighted animals in your community.</Text>
      </View>
      <View style={styles.steps}>
        <Text style={styles.step}>1  Report</Text>
        <Text style={styles.step}>2  Share</Text>
        <Text style={styles.step}>3  Reunite</Text>
      </View>
      <PrimaryButton
        label="Explore the app"
        onPress={() => navigation.getParent()?.replace(routes.member)}
      />
      <Text style={styles.note}>Checkpoint 0 preview · Account access arrives in the next milestone.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', marginBottom: spacing.xxxl },
  logo: { width: 245, height: 84, marginBottom: spacing.xxl },
  title: { ...typography.display, color: colors.textPrimary, textAlign: 'center', marginBottom: spacing.md },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  steps: { gap: spacing.md, padding: spacing.xl, marginBottom: spacing.xxl, borderRadius: 18, backgroundColor: colors.primaryLight },
  step: { ...typography.bodyStrong, color: colors.primaryDark },
  note: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg }
});
