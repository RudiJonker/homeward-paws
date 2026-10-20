import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { links } from '../../config/links';
import { colors, spacing, typography } from '../../theme';

function LinkRow({ label, url }) {
  return <Pressable onPress={() => Linking.openURL(url)} style={styles.row}><Text style={styles.link}>{label}</Text></Pressable>;
}

export function PrivacyContactScreen() {
  return <ScreenContainer><Text style={styles.title}>Privacy and contact</Text><Text style={styles.body}>Your home area, coordinates, mobile number and email are private. Phone and WhatsApp will only appear on a future report when you explicitly enable them.</Text><View style={styles.list}><LinkRow label="Privacy Policy" url={links.privacy} /><LinkRow label="Terms of Use" url={links.terms} /><LinkRow label="Account deletion information" url={links.deleteAccount} /></View></ScreenContainer>;
}

export function HelpSafetyScreen() {
  return <ScreenContainer><Text style={styles.title}>Help and safety</Text><Text style={styles.body}>Homeward Paws is not an emergency, veterinary, or ownership-determination service. Contact a vet, SPCA, animal-welfare organisation, or SAPS when appropriate.</Text><View style={styles.list}><LinkRow label="Help and safety guide" url={links.help} /><LinkRow label="Child safety standards" url={links.childSafety} /><LinkRow label="Contact support" url={`mailto:${links.supportEmail}?subject=Homeward%20Paws%20support`} /></View></ScreenContainer>;
}

export function AboutScreen() {
  return <ScreenContainer><Text style={styles.title}>About Homeward Paws</Text><Text style={styles.body}>A free South African community app helping missing, found and sighted animals find their way home.</Text><Text style={styles.body}>Digitack (Pty) Ltd · Version 0.1.0</Text><LinkRow label={links.supportEmail} url={`mailto:${links.supportEmail}?subject=Homeward%20Paws%20support`} /></ScreenContainer>;
}

const styles = StyleSheet.create({ title: { ...typography.screenTitle, color: colors.textPrimary, marginBottom: spacing.lg }, body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg }, list: { gap: spacing.sm }, row: { minHeight: 52, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }, link: { ...typography.bodyStrong, color: colors.primary } });
