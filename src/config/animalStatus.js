import { colors } from '../theme';

const appearances = {
  safe: { label: 'SAFE', icon: 'home-heart', tint: colors.reunitedTint, ink: colors.reunitedOnTint },
  missing: { label: 'MISSING', icon: 'alert-circle-outline', tint: colors.missingTint, ink: colors.missingOnTint },
  in_care: { label: 'IN CARE', icon: 'heart-outline', tint: colors.foundTint, ink: colors.foundOnTint },
  fostered: { label: 'FOSTERED', icon: 'home-outline', tint: colors.primaryLight, ink: colors.primaryDark },
  transferred: { label: 'TRANSFERRED', icon: 'swap-horizontal', tint: colors.primaryLight, ink: colors.primaryDark },
  archived: { label: 'ARCHIVED', icon: 'archive-outline', tint: colors.surfaceMuted, ink: colors.textSecondary },
  deceased: { label: 'DECEASED', icon: 'heart-broken-outline', tint: colors.surfaceMuted, ink: colors.textSecondary }
};

export function animalStatusAppearance(status) {
  return appearances[status] ?? {
    label: typeof status === 'string' ? status.replaceAll('_', ' ').toUpperCase() : 'UNKNOWN',
    icon: 'information-outline',
    tint: colors.surfaceMuted,
    ink: colors.textSecondary
  };
}
