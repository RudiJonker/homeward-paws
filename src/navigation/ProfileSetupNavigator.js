import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CompleteProfileScreen } from '../screens/profile/CompleteProfileScreen';
import { SetHomeAreaScreen } from '../screens/profile/SetHomeAreaScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export function ProfileSetupNavigator() {
  return <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.textPrimary }}><Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} options={{ headerShown: false }} /><Stack.Screen name="SetHomeArea" component={SetHomeAreaScreen} options={{ title: 'Home area', headerBackVisible: false }} /></Stack.Navigator>;
}
