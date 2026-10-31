import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

// Menahan splash screen native sampai aplikasi siap ditampilkan.
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />

      {/* Stack mengatur navigasi antarhalaman aplikasi. */}
      <Stack
        screenOptions={{
          headerTintColor: '#ff6b00',
          contentStyle: { backgroundColor: '#f7f8fc' },
        }}
      >
        {/* Halaman utama: login, register, dan dashboard. */}
        <Stack.Screen
          name="index"
          options={{
            title: 'Bidly',
            headerShown: false,
          }}
        />

        {/* Halaman Explore. */}
        <Stack.Screen
          name="explore"
          options={{
            title: 'Explore',
          }}
        />

        {/* Halaman detail produk dengan parameter dinamis [id]. */}
        <Stack.Screen
          name="product/[id]"
          options={{
            title: 'Detail Produk',
            headerBackTitle: 'Kembali',
          }}
        />
      </Stack>
    </ThemeProvider>
  );
}
