import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { EmailVerificationScreen } from '../screens/auth/EmailVerificationScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ResetPasswordScreen } from '../screens/auth/ResetPasswordScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { BrowseScreen } from '../screens/main/BrowseScreen';
import { routes } from './routes';

const Stack = createNativeStackNavigator();

export function PublicNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={routes.welcome} component={WelcomeScreen} />
      <Stack.Screen name="GuestBrowse" component={BrowseScreen} options={{ headerShown: true, title: 'Browse as guest' }} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
