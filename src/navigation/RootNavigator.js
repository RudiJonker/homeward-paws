import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LoadingScreen } from '../components/LoadingScreen';
import { useSession } from '../context/SessionContext';
import { SuspendedAccountScreen } from '../screens/auth/SuspendedAccountScreen';
import { colors } from '../theme';
import { AdminNavigator } from './AdminNavigator';
import { MemberNavigator } from './MemberNavigator';
import { PublicNavigator } from './PublicNavigator';
import { ProfileSetupNavigator } from './ProfileSetupNavigator';
import { routes } from './routes';

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
  const { session, profile, loading } = useSession();
  if (loading) return <LoadingScreen />;

  const linking = {
    prefixes: ['homewardpaws://'],
    config: { screens: { Public: { screens: { ResetPassword: 'auth/reset', EmailVerification: 'auth/verify' } } } }
  };

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme} linking={linking}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!session ? <Stack.Screen name={routes.public} component={PublicNavigator} /> : null}
          {session && profile?.account_status === 'suspended' ? <Stack.Screen name="Suspended" component={SuspendedAccountScreen} /> : null}
          {session && profile?.account_status !== 'suspended' && !profile?.profile_completed ? <Stack.Screen name="ProfileSetup" component={ProfileSetupNavigator} /> : null}
          {session && profile?.account_status !== 'suspended' && profile?.profile_completed ? <Stack.Screen name={routes.member} component={MemberNavigator} /> : null}
          {session && profile?.role === 'admin' && profile?.profile_completed ? <Stack.Screen name={routes.admin} component={AdminNavigator} /> : null}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
