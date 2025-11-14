import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureGoogleSignIn } from '@/lib/google-calendar-auth';

export const unstable_settings = {
  // Set landing page as initial route
  initialRouteName: 'landing',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // Initialize Google Sign-In on app startup
  useEffect(() => {
    console.log('🚀 Initializing Google Calendar integration...');
    configureGoogleSignIn();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="landing" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="auth0-sign-in" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Profile' }} />
          <Stack.Screen name="google-calendar-test" options={{ headerShown: false }} />
          <Stack.Screen 
            name="breathing-session" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
              animation: 'fade',
            }} 
          />
          <Stack.Screen 
            name="sand-timer" 
            options={{ 
              presentation: 'fullScreenModal',
              headerShown: false,
              animation: 'fade',
              contentStyle: { backgroundColor: 'transparent' },
            }} 
          />
          <Stack.Screen 
            name="sand-timer-input" 
            options={{ 
              presentation: 'modal',
              headerShown: false,
              animation: 'slide_from_bottom',
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
