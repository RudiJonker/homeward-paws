import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { BrowseScreen } from '../screens/main/BrowseScreen';
import { LinkedSightingScreen } from '../screens/main/LinkedSightingScreen';
import { MissingReportDetailScreen } from '../screens/main/MissingReportDetailScreen';
import { ReportMissingContentScreen } from '../screens/main/ReportMissingContentScreen';

const Stack = createNativeStackNavigator();

export function BrowseNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BrowseMissing" component={BrowseScreen} />
      <Stack.Screen name="MissingReportDetail" component={MissingReportDetailScreen} />
      <Stack.Screen name="ReportMissingContent" component={ReportMissingContentScreen} />
      <Stack.Screen name="LinkedSighting" component={LinkedSightingScreen} />
    </Stack.Navigator>
  );
}
