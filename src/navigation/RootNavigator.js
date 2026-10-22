import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '../components/LoadingScreen';
import { useSession } from '../context/SessionContext';
import { SuspendedAccountScreen } from '../screens/auth/SuspendedAccountScreen';
import { AuthCallbackScreen } from '../screens/auth/AuthCallbackScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { colors } from '../theme';
import { AdminNavigator } from './AdminNavigator';
import { MemberNavigator } from './MemberNavigator';
import { PublicNavigator } from './PublicNavigator';
import { ProfileSetupNavigator } from './ProfileSetupNavigator';
import { routes } from './routes';
import { linking } from './linking';

const Stack = createNativeStackNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent
  }
};

export function RootNavigator() {
  const { session, profile, loading, recoveryFlow } = useSession();
  if (loading) return <LoadingScreen />;

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme} linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {recoveryFlow ? <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} /> : null}
          {!recoveryFlow && !session ? <Stack.Screen name={routes.public} component={PublicNavigator} /> : null}
          {!recoveryFlow && session && profile?.account_status === 'suspended' ? <Stack.Screen name="Suspended" component={SuspendedAccountScreen} /> : null}
          {!recoveryFlow && session && profile?.account_status !== 'suspended' && !profile?.profile_completed ? <Stack.Screen name="ProfileSetup" component={ProfileSetupNavigator} /> : null}
          {!recoveryFlow && session && profile?.account_status !== 'suspended' && profile?.profile_completed ? <Stack.Screen name={routes.member} component={MemberNavigator} /> : null}
          {!recoveryFlow && session && profile?.role === 'admin' && profile?.profile_completed ? <Stack.Screen name={routes.admin} component={AdminNavigator} /> : null}
          <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
