import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing, typography } from '../theme';

const AppDialogContext = createContext(null);

export function useAppDialog() {
  const context = useContext(AppDialogContext);
  if (!context) throw new Error('AppDialogProvider is required.');
  return context;
}

export function AppDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const handled = useRef(false);
  const showDialog = useCallback((title, message, buttons = [{ text: 'OK' }]) => {
    handled.current = false;
    setDialog({ title, message, buttons: buttons.length ? buttons : [{ text: 'OK' }] });
  }, []);
  const value = useMemo(() => ({ showDialog }), [showDialog]);

  const dismiss = () => {
    if (handled.current) return;
    handled.current = true;
    setDialog(null);
  };
  const buttons = dialog?.buttons ?? [];
  const primary = buttons.find((button) => button.style !== 'cancel') ?? buttons[0];
  const secondary = buttons.filter((button) => button !== primary);
  const destructive = primary?.style === 'destructive';
  const success = !destructive && /saved|published|confirmed|closed/i.test(dialog?.title ?? '');
  const icon = destructive ? 'alert-circle-outline' : success ? 'check' : 'information-outline';
  const iconColor = destructive ? colors.error : colors.primaryDark;
  const iconBackground = destructive ? colors.missingTint : colors.primaryLight;

  function choose(button) {
    if (handled.current) return;
    handled.current = true;
    setDialog(null);
    button?.onPress?.();
  }

  return <AppDialogContext.Provider value={value}>
    {children}
    <Modal visible={Boolean(dialog)} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card} accessibilityViewIsModal>
          <View style={[styles.icon, { backgroundColor: iconBackground }]}>
            <MaterialCommunityIcons name={icon} size={30} color={iconColor} />
          </View>
          <Text accessibilityRole="header" style={styles.title}>{dialog?.title}</Text>
          {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
          {primary ? <Pressable accessibilityRole="button" onPress={() => choose(primary)} style={({ pressed }) => [styles.primary, destructive && styles.destructive, pressed && styles.pressed]}>
            <Text style={styles.primaryText}>{primary.text ?? 'OK'}</Text>
          </Pressable> : null}
          {secondary.map((button, index) => <Pressable key={`${button.text ?? 'action'}-${index}`} accessibilityRole="button" onPress={() => choose(button)} style={styles.secondary}>
            <Text style={styles.secondaryText}>{button.text ?? 'Cancel'}</Text>
          </Pressable>)}
        </View>
      </View>
    </Modal>
  </AppDialogContext.Provider>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, backgroundColor: colors.overlay },
  card: { width: '100%', maxWidth: 380, gap: spacing.lg, padding: spacing.xxl, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, ...shadows.raised },
  icon: { width: 56, height: 56, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.screenTitle, color: colors.textPrimary },
  message: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  primary: { minHeight: 48, justifyContent: 'center', alignItems: 'center', borderRadius: radii.md, paddingHorizontal: spacing.lg, backgroundColor: colors.primary },
  destructive: { backgroundColor: colors.error },
  pressed: { opacity: 0.85 },
  primaryText: { ...typography.button, color: colors.textOnPrimary, textAlign: 'center' },
  secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...typography.button, color: colors.primary, textAlign: 'center' }
});
