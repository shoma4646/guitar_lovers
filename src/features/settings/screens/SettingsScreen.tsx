/**
 * 設定/About画面
 *
 * アプリ情報、プライバシーポリシー・サポートへの導線、
 * 利用しているサービス（YouTube API Services）の開示をまとめる。
 * App Store 5.1.1(i) 対応（プライバシーポリシー導線必須）と
 * YouTube Developer Policies III.E 対応（利用旨・Googleプライバシーポリシーリンクの明示）を兼ねる。
 */

import { ReactNode } from "react";
import { View, Text, Pressable, ScrollView, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { IconButton } from "@/shared/components/atoms/IconButton";
import { colors, spacing } from "@/shared/theme";
import { SCREEN_HORIZONTAL_PADDING } from "@/shared/constants/layout";
import { Card } from "@/shared/components/molecules/Card";
import { ErrorBoundary } from "@/shared/components/molecules/ErrorBoundary";
import {
  PRIVACY_POLICY_URL,
  SUPPORT_URL,
  YOUTUBE_TERMS_URL,
  GOOGLE_PRIVACY_URL,
} from "@/shared/constants/links";
import { ReminderSettingsSection } from "../components/ReminderSettingsSection";

type SectionProps = {
  title: string;
  children: ReactNode;
};

const rowStyle = { paddingHorizontal: spacing.lg, paddingVertical: spacing.md };
const rowDividerStyle = { borderBottomWidth: 1, borderBottomColor: colors.divider };

function Section({ title, children }: SectionProps) {
  return (
    <View style={{ marginBottom: spacing["3xl"] }}>
      <Text
        accessibilityRole="header"
        className="text-label-sm"
        style={{
          color: colors.onSurfaceVariant,
          fontWeight: "600",
          paddingHorizontal: spacing.xs,
          marginBottom: spacing.md,
        }}
      >
        {title}
      </Text>
      <Card padding={0}>{children}</Card>
    </View>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  isLast?: boolean;
};

function InfoRow({ label, value, isLast }: InfoRowProps) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={[rowStyle, isLast ? undefined : rowDividerStyle]}
    >
      <Text className="text-body-md" style={{ color: colors.onSurface }}>
        {label}
      </Text>
      <Text className="text-body-md" style={{ color: colors.onSurfaceVariant }}>
        {value}
      </Text>
    </View>
  );
}

type LinkRowProps = {
  label: string;
  url: string;
  isLast?: boolean;
};

function LinkRow({ label, url, isLast }: LinkRowProps) {
  const handlePress = () => {
    Linking.openURL(url).catch(() => {
      // URLを開けない場合は何もしない(端末側の制約等)
    });
  };

  return (
    <Pressable
      onPress={handlePress}
      className="flex-row items-center justify-between active:opacity-70"
      style={[rowStyle, isLast ? undefined : rowDividerStyle]}
      accessibilityRole="link"
      accessibilityLabel={label}
    >
      <Text className="text-body-md" style={{ color: colors.onSurface }}>
        {label}
      </Text>
      <Text style={{ color: colors.outline, fontSize: 18 }}>{"›"}</Text>
    </Pressable>
  );
}

export function SettingsScreen() {
  const router = useRouter();

  const appName = Constants.expoConfig?.name ?? "Guitar Lovers";
  const appVersion = Constants.expoConfig?.version ?? "-";

  return (
    <ErrorBoundary>
      <SafeAreaView
        testID="settings-screen"
        edges={["top", "bottom"]}
        className="flex-1 bg-surface"
        onAccessibilityEscape={() => router.back()}
      >
        {/* Top App Bar */}
        <View
          testID="settings-header"
          className="flex-row items-center justify-between"
          style={{ height: 44, paddingHorizontal: SCREEN_HORIZONTAL_PADDING }}
        >
          <Text
            accessibilityRole="header"
            style={{ fontSize: 22, fontWeight: "800", color: colors.onSurface }}
            maxFontSizeMultiplier={1.3}
          >
            設定
          </Text>
          <IconButton
            name="close"
            size={24}
            accessibilityLabel="閉じる"
            onPress={() => router.back()}
            // 44ptの枠にしてもアイコンの右端が余白の線に揃うよう、枠の広がり分だけ右へ出す
            style={{ marginRight: -10 }}
          />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: SCREEN_HORIZONTAL_PADDING,
            paddingTop: spacing.md,
            paddingBottom: spacing["4xl"],
          }}
          showsVerticalScrollIndicator={false}
        >
          <Section title="リマインド">
            <ReminderSettingsSection />
          </Section>

          <Section title="アプリについて">
            <InfoRow label="アプリ名" value={appName} />
            <InfoRow label="バージョン" value={appVersion} isLast />
          </Section>

          <Section title="プライバシーとサポート">
            <LinkRow label="プライバシーポリシー" url={PRIVACY_POLICY_URL} />
            <LinkRow label="サポート・お問い合わせ" url={SUPPORT_URL} isLast />
          </Section>

          <Section title="利用しているサービス">
            <View
              style={[rowDividerStyle, { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm }]}
            >
              <Text
                className="text-body-md"
                style={{ color: colors.onSurfaceVariant }}
              >
                このアプリはYouTube API Servicesを利用しています。
              </Text>
            </View>
            <LinkRow label="YouTube利用規約" url={YOUTUBE_TERMS_URL} />
            <LinkRow
              label="Googleプライバシーポリシー"
              url={GOOGLE_PRIVACY_URL}
              isLast
            />
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
}
