import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AdminPlaceholderScreen } from '../screens/admin/AdminPlaceholderScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export function AdminNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false }}>
      <Stack.Screen name="AdminHome" component={AdminPlaceholderScreen} options={{ title: 'Administration' }} />
    </Stack.Navigator>
  );
}
