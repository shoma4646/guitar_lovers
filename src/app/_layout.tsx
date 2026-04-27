/**
 * アプリルートレイアウト
 * Expo RouterのStackナビゲーションとグローバルスタイルを設定する
 */

import "../../global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { colors } from "@/shared/constants/colors";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";

const queryClient = new QueryClient();

/**
 * ルートレイアウトコンポーネント
 * 全画面共通のナビゲーション設定とステータスバーを管理する
 */
export default function RootLayout() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="light" backgroundColor={colors.bgDark} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bgDark },
            headerTintColor: colors.textWhite,
            contentStyle: { backgroundColor: colors.bgDark },
            headerShadowVisible: false,
            animation: "fade",
          }}
        >
          {/* タブ画面グループ - ヘッダーはタブレイアウト側で管理 */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* インデックスリダイレクト - ヘッダー非表示 */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
        </Stack>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
