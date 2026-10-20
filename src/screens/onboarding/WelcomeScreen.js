import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { colors, spacing, typography } from '../../theme';

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
      <PrimaryButton label="Create account" onPress={() => navigation.navigate('SignUp')} />
      <Pressable onPress={() => navigation.navigate('Login')}><Text style={styles.login}>Log in</Text></Pressable>
      <Pressable accessibilityRole="button" onPress={() => navigation.navigate('GuestBrowse')} style={styles.guestButton}><Text style={styles.guestLabel}>Browse as guest</Text></Pressable>
      <Text style={styles.note}>You can browse public reports without an account. Publishing and contributing require a completed member profile.</Text>
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
  note: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },
  login: { ...typography.button, color: colors.primary, textAlign: 'center', padding: spacing.lg },
  guestButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: 12, paddingHorizontal: spacing.xl },
  guestLabel: { ...typography.button, color: colors.primary }
});
