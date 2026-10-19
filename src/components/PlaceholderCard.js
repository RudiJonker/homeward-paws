import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../theme';

export function PlaceholderCard({ icon, title, body, tint = colors.primaryLight, color = colors.primary }) {
  return (
    <View style={styles.card}>
      <View style={[styles.iconTile, { backgroundColor: tint }]}>
        <MaterialCommunityIcons name={icon} size={26} color={color} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: spacing.lg, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.card },
  iconTile: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { ...typography.cardTitle, color: colors.textPrimary, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.textSecondary }
});
