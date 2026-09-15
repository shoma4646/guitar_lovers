/**
 * アプリルートレイアウト
 *
 * Stitch DESIGN.md（modern_guitarist）準拠の warm off-white 背景に統一する。
 * Stack ヘッダーは Tabs グループでは非表示にし、画面ごとに自前のヘッダーを描く方針。
 */

import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { colors } from "@/shared/theme";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import { ReminderBridge } from "@/features/reminder/components/ReminderBridge";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="dark" backgroundColor={colors.surface} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.onSurface,
            contentStyle: { backgroundColor: colors.surface },
            headerShadowVisible: false,
            animation: "fade",
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
        <ReminderBridge />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
