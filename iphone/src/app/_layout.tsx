import { NotoSerifKR_400Regular, NotoSerifKR_700Bold, useFonts } from '@expo-google-fonts/noto-serif-kr';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { cleanupPhotos } from '@/data/photos';
import { store } from '@/data/store';
import { useColors } from '@/theme/colors';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  const c = useColors();
  const [loaded, error] = useFonts({ NotoSerifKR_400Regular, NotoSerifKR_700Bold });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  useEffect(() => {
    cleanupPhotos(new Set(store.get().posts.flatMap(p => p.photos)));
  }, []);

  if (!loaded && !error) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider value={{ ...base, colors: { ...base.colors, background: c.background, card: c.background, primary: c.accent, text: c.ink } }}>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          headerTintColor: c.accent,
          headerTitleStyle: { fontFamily: 'NotoSerifKR_700Bold', color: c.ink },
          contentStyle: { backgroundColor: c.background },
        }}>
        <Stack.Screen name="index" options={{ title: '글방', headerLargeTitleEnabled: true,
          headerLargeTitleStyle: { fontFamily: 'NotoSerifKR_700Bold', color: c.ink } }} />
        <Stack.Screen name="story-form" options={{ presentation: 'formSheet', sheetGrabberVisible: true, sheetAllowedDetents: [0.6, 1] }} />
        <Stack.Screen name="photo" options={{ presentation: 'fullScreenModal', headerShown: false, contentStyle: { backgroundColor: '#000' } }} />
      </Stack>
    </ThemeProvider>
  );
}
