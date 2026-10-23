import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PostsProvider } from '@/store/posts';

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = useTheme();

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <PostsProvider>
        <StatusBar style="auto" />
        {/* 모든 화면에 공통으로 적용할 헤더 모양이에요. 그림자 없이 종이색으로 조용하게. */}
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.background },
            headerShadowVisible: false,
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: Fonts.serif, fontSize: 17 },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: colors.background },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </PostsProvider>
    </ThemeProvider>
  );
}
