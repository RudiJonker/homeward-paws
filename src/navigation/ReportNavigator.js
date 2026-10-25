import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ReportMenuScreen } from '../screens/main/ReportMenuScreen';
import { MissingAppearanceScreen } from '../screens/reports/MissingAppearanceScreen';
import { MissingLastSeenScreen } from '../screens/reports/MissingLastSeenScreen';
import { MissingLastSeenLocationScreen } from '../screens/reports/MissingLastSeenLocationScreen';
import { MissingPreviewScreen } from '../screens/reports/MissingPreviewScreen';
import { MissingPublishedScreen } from '../screens/reports/MissingPublishedScreen';
import { MissingSafetyContactScreen } from '../screens/reports/MissingSafetyContactScreen';
import { SelectMissingAnimalScreen } from '../screens/reports/SelectMissingAnimalScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export function ReportNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.textPrimary }}>
      <Stack.Screen name="ReportMenu" component={ReportMenuScreen} options={{ headerShown: false }} />
      <Stack.Screen name="SelectMissingAnimal" component={SelectMissingAnimalScreen} options={{ title: 'Select an animal' }} />
      <Stack.Screen name="MissingAppearance" component={MissingAppearanceScreen} options={{ title: 'Current appearance' }} />
      <Stack.Screen name="MissingLastSeen" component={MissingLastSeenScreen} options={{ title: 'Last-seen details' }} />
      <Stack.Screen name="MissingLastSeenLocation" component={MissingLastSeenLocationScreen} options={{ title: 'Last-seen location' }} />
      <Stack.Screen name="MissingSafetyContact" component={MissingSafetyContactScreen} options={{ title: 'Safety and contact' }} />
      <Stack.Screen name="MissingPreview" component={MissingPreviewScreen} options={{ title: 'Review missing report' }} />
      <Stack.Screen name="MissingPublished" component={MissingPublishedScreen} options={{ title: 'Report published' }} />
    </Stack.Navigator>
  );
}
