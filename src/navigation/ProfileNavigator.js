import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AnimalDetailScreen } from '../screens/animals/AnimalDetailScreen';
import { MyAnimalsScreen } from '../screens/animals/MyAnimalsScreen';
import { RegisterAnimalScreen } from '../screens/animals/RegisterAnimalScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { AboutScreen, HelpSafetyScreen, PrivacyContactScreen } from '../screens/profile/InformationScreens';
import { CompleteProfileScreen } from '../screens/profile/CompleteProfileScreen';
import { DeleteAccountScreen } from '../screens/profile/DeleteAccountScreen';
import { MyReportsScreen } from '../screens/profile/MyReportsScreen';
import { SetHomeAreaScreen } from '../screens/profile/SetHomeAreaScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export function ProfileNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, headerTintColor: colors.textPrimary }}>
      <Stack.Screen name="ProfileHome" component={ProfileScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MyAnimals" component={MyAnimalsScreen} options={{ title: 'My Animals' }} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} options={{ title: 'My Reports' }} />
      <Stack.Screen name="ArchivedAnimals" component={MyAnimalsScreen} initialParams={{ archived: true }} options={{ title: 'Archived Animals' }} />
      <Stack.Screen name="AnimalDetail" component={AnimalDetailScreen} options={{ title: 'Animal profile' }} />
      <Stack.Screen name="RegisterAnimal" component={RegisterAnimalScreen} options={{ title: 'Register an animal' }} />
      <Stack.Screen name="EditAnimal" component={RegisterAnimalScreen} options={{ title: 'Edit animal' }} />
      <Stack.Screen name="EditProfile" component={CompleteProfileScreen} options={{ title: 'Edit profile' }} />
      <Stack.Screen name="SetHomeArea" component={SetHomeAreaScreen} options={{ title: 'Home area' }} />
      <Stack.Screen name="PrivacyContact" component={PrivacyContactScreen} options={{ title: 'Privacy and contact' }} />
      <Stack.Screen name="HelpSafety" component={HelpSafetyScreen} options={{ title: 'Help and safety' }} />
      <Stack.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
      <Stack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: 'Delete account' }} />
    </Stack.Navigator>
  );
}
