import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MISSING_BROWSE_ENABLED } from '../config/checkpoint3';
import { FollowingScreen } from '../screens/main/FollowingScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { colors, typography } from '../theme';
import { BrowseNavigator } from './BrowseNavigator';
import { useSession } from '../context/SessionContext';
import { routes } from './routes';
import { ProfileNavigator } from './ProfileNavigator';
import { ReportNavigator } from './ReportNavigator';

const Tab = createBottomTabNavigator();

const icons = {
  [routes.home]: 'home-outline',
  [routes.browse]: 'magnify',
  [routes.report]: 'plus-circle-outline',
  [routes.following]: 'heart-outline',
  [routes.profile]: 'account-outline'
};

export function MemberNavigator({ navigation }) {
  const insets = useSafeAreaInsets();
  const { pendingSightingIntent, setPendingSightingIntent, pendingContentReportIntent, setPendingContentReportIntent } = useSession();

  useEffect(() => {
    if (!MISSING_BROWSE_ENABLED || !pendingSightingIntent?.reportId) return;
    navigation.navigate(routes.member, {
      screen: routes.browse,
      params: { screen: 'LinkedSighting', params: pendingSightingIntent }
    });
    setPendingSightingIntent(null).catch(() => {});
  }, [navigation, pendingSightingIntent, setPendingSightingIntent]);

  useEffect(() => {
    if (!MISSING_BROWSE_ENABLED || !pendingContentReportIntent?.reportId) return;
    navigation.navigate(routes.member, {
      screen: routes.browse,
      params: { screen: 'ReportMissingContent', params: pendingContentReportIntent }
    });
    setPendingContentReportIntent(null).catch(() => {});
  }, [navigation, pendingContentReportIntent, setPendingContentReportIntent]);

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
      <Tab.Screen name={routes.browse} component={BrowseNavigator} />
      <Tab.Screen
        name={routes.report}
        component={ReportNavigator}
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
