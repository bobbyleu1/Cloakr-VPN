import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <>
      <Stack>
        {/*
          This tells Expo Router to use app/index.tsx as the main screen.
          We no longer need to reference the "(tabs)" directory.
        */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* A default not-found page */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}
