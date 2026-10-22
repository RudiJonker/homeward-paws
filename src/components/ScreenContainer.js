import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

export function ScreenContainer({ children, scroll = true, contentContainerStyle, scrollRef }) {
  const contentStyle = [styles.content, !scroll && styles.fill, contentContainerStyle];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardArea}>
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={contentStyle}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <SafeAreaView style={contentStyle}>{children}</SafeAreaView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardArea: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, backgroundColor: colors.background },
  fill: { flex: 1 }
});
