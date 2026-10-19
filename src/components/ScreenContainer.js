import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../theme';

export function ScreenContainer({ children, scroll = true, contentContainerStyle }) {
  const contentStyle = [styles.content, !scroll && styles.fill, contentContainerStyle];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={contentStyle} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <SafeAreaView style={contentStyle}>{children}</SafeAreaView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, backgroundColor: colors.background },
  fill: { flex: 1 }
});
