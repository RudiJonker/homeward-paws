import { Component } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from './PrimaryButton';
import { colors, spacing, typography } from '../theme';

export class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>Your work is safe. Please try opening this screen again.</Text>
          <PrimaryButton label="Try again" onPress={() => this.setState({ hasError: false })} />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xxl, backgroundColor: colors.background },
  title: { ...typography.screenTitle, color: colors.textPrimary, marginBottom: spacing.sm },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xxl }
});
