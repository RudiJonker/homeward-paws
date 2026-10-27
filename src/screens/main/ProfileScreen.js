import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '../../components/ScreenContainer';
import { PrimaryButton } from '../../components/PrimaryButton';
import { MISSING_BROWSE_ENABLED } from '../../config/checkpoint3';
import { useSession } from '../../context/SessionContext';
import { supabase } from '../../services/supabase';
import { colors, spacing, typography } from '../../theme';

export function ProfileScreen({ navigation }) {
  const { profile, privateProfile } = useSession();
  const items = [
    ['paw-outline', 'My Animals', 'MyAnimals'],
    ['file-document-outline', 'My Reports', 'MyReports'],
    ...(MISSING_BROWSE_ENABLED ? [['image-remove-outline', 'Sighting photos', 'ManageSightingPhotos']] : []),
    ['eye-outline', 'My Sightings', null, 'Checkpoint 4'],
    ['account-edit-outline', 'Edit profile', 'EditProfile'],
    ['map-marker-outline', 'Edit home area', 'SetHomeArea'],
    ['shield-lock-outline', 'Privacy and contact', 'PrivacyContact'],
    ['lifebuoy', 'Help and safety', 'HelpSafety'],
    ['information-outline', 'About', 'About'],
    ['delete-outline', 'Delete account', 'DeleteAccount']
  ];
  return (
    <ScreenContainer>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.name}>{profile?.display_name || `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()}</Text>
      <Text style={styles.subtitle}>{privateProfile?.suburb}, {privateProfile?.city}</Text>
      <View style={styles.menu}>{items.map(([icon, label, route, badge]) => (
        <Pressable key={label} disabled={!route} onPress={() => navigation.navigate(route)} style={styles.row}>
          <MaterialCommunityIcons name={icon} size={24} color={route ? colors.primary : colors.textSecondary} />
          <Text style={styles.rowLabel}>{label}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textSecondary} />}
        </Pressable>
      ))}</View>
      <View style={styles.logout}><PrimaryButton label="Log out" onPress={() => supabase.auth.signOut()} /></View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.screenTitle, color: colors.textPrimary },
  name: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.xxl },
  menu: { gap: spacing.sm },
  row: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...typography.bodyStrong, color: colors.textPrimary, flex: 1 },
  badge: { ...typography.caption, color: colors.textSecondary },
  logout: { marginTop: spacing.xxl }
});
