import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { routes } from './routes';

const Stack = createNativeStackNavigator();

export function PublicNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.welcome} component={WelcomeScreen} />
    </Stack.Navigator>
  );
}
