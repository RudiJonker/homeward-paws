import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrowseScreen } from '../screens/main/BrowseScreen';
import { FollowingScreen } from '../screens/main/FollowingScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { ReportMenuScreen } from '../screens/main/ReportMenuScreen';
import { colors, typography } from '../theme';
import { routes } from './routes';
import { ProfileNavigator } from './ProfileNavigator';

const Tab = createBottomTabNavigator();

const icons = {
  [routes.home]: 'home-outline',
  [routes.browse]: 'magnify',
  [routes.report]: 'plus-circle-outline',
  [routes.following]: 'heart-outline',
  [routes.profile]: 'account-outline'
};

export function MemberNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 64 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8)
          }
        ],
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, size }) => (
          <MaterialCommunityIcons name={icons[route.name]} color={color} size={size} />
        )
      })}
    >
      <Tab.Screen name={routes.home} component={HomeScreen} />
      <Tab.Screen name={routes.browse} component={BrowseScreen} />
      <Tab.Screen
        name={routes.report}
        component={ReportMenuScreen}
        options={{ tabBarAccessibilityLabel: 'Report an animal' }}
      />
      <Tab.Screen name={routes.following} component={FollowingScreen} />
      <Tab.Screen name={routes.profile} component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { paddingTop: 8, borderTopColor: colors.border, backgroundColor: colors.surface },
  tabLabel: { ...typography.caption }
});
