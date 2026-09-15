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
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
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

function Section({ title, children }: SectionProps) {
  return (
    <View className="mb-xl">
      <Text
        className="text-label-sm mb-sm"
        style={{
          color: colors.outline,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          fontWeight: "600",
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View className="bg-surface-container-lowest rounded-xl overflow-hidden">
        {children}
      </View>
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
      className="flex-row items-center justify-between px-lg py-md"
      style={
        isLast
          ? undefined
          : { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }
      }
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
      className="flex-row items-center justify-between px-lg py-md active:opacity-70"
      style={
        isLast
          ? undefined
          : { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }
      }
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
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
        {/* Top App Bar */}
        <View className="flex-row items-center justify-between px-margin-mobile h-16">
          <Text className="font-bold text-headline-lg text-on-surface">
            設定
          </Text>
          <Pressable
            onPress={() => router.back()}
            className="active:opacity-70"
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="閉じる"
          >
            <Icon name="close" size={24} color={colors.onSurfaceVariant} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
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
              className="px-lg pt-md pb-sm"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.outlineVariant }}
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
