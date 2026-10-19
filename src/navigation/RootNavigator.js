import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '../theme';
import { AdminNavigator } from './AdminNavigator';
import { MemberNavigator } from './MemberNavigator';
import { PublicNavigator } from './PublicNavigator';
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
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={navigationTheme}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName={routes.public}>
          <Stack.Screen name={routes.public} component={PublicNavigator} />
          <Stack.Screen name={routes.member} component={MemberNavigator} />
          <Stack.Screen name={routes.admin} component={AdminNavigator} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
