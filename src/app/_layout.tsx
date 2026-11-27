import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack, router, type Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { Platform, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { configureAuctionNotifications } from '@/services/pushNotifications';

// Menahan splash screen native sampai aplikasi siap ditampilkan.
SplashScreen.preventAutoHideAsync().catch(() => {});
configureAuctionNotifications();

function useAuctionNotificationNavigation() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const openNotificationTarget = (notification: Notifications.Notification) => {
      const data = notification.request.content.data as Record<string, unknown>;
      const productId = data.productId ?? data.id;

      if (typeof productId === 'string' || typeof productId === 'number') {
        router.push({ pathname: '/product/[id]', params: { id: String(productId) } } as Href);
        Notifications.clearLastNotificationResponse();
        return;
      }

      const url = data.url;
      if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
        router.push(url as Href);
        Notifications.clearLastNotificationResponse();
      }
    };

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) openNotificationTarget(lastResponse.notification);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      openNotificationTarget(response.notification);
    });

    return () => subscription.remove();
  }, []);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useAuctionNotificationNavigation();

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
