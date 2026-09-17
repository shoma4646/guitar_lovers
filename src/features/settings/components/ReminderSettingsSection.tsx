/**
 * 設定画面のリマインド通知セクション
 *
 * 通知のON/OFF、送信時刻（自動 or 30分刻みの手動指定）、次回の予定を表示する。
 * OSで通知が拒否されている場合は端末の設定への導線を出す
 */

import { View, Text, Pressable, Switch, Linking } from "react-native";
import { colors } from "@/shared/theme";
import { useReminderSettings } from "@/features/reminder/api/useReminderSettings";
import { useReminderPermission } from "@/features/reminder/api/useReminderPermission";
import { useNextReminderPlan } from "@/features/reminder/api/useNextReminderPlan";
import { useUpdateReminderSettings } from "@/features/reminder/api/useUpdateReminderSettings";
import { ensureReminderPermission } from "@/features/reminder/services/reminderScheduler";
import {
  formatReminderTime,
  shiftReminderTime,
} from "@/features/reminder/lib/reminderTime";
import type { ReminderTime } from "@/shared/lib/schemas/reminderSettings";

const STEP_MINUTES = 30;
const DEFAULT_MANUAL_TIME: ReminderTime = { hour: 20, minute: 0 };

const rowBorder = { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant };

function formatFireAt(date: Date): string {
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

type StepButtonProps = {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
};

function StepButton({ label, accessibilityLabel, onPress }: StepButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center active:opacity-70"
      style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.surfaceContainerLow,
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Text style={{ color: colors.onSurface, fontSize: 18, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}

export function ReminderSettingsSection() {
  const { data: settings } = useReminderSettings();
  const { data: permission, refetch: refetchPermission } = useReminderPermission();
  const { data: nextPlan } = useNextReminderPlan();
  const { mutate: updateSettings } = useUpdateReminderSettings();

  if (!settings || !permission) {
    return null;
  }

  const isActive = settings.enabled && permission.granted;
  const isBlockedByOs = !permission.granted && !permission.canAskAgain;

  const handleToggle = async (value: boolean) => {
    if (!value) {
      updateSettings({ enabled: false });
      return;
    }
    if (!permission.granted) {
      if (isBlockedByOs) {
        void Linking.openSettings();
        return;
      }
      const granted = await ensureReminderPermission();
      void refetchPermission();
      if (!granted) return;
    }
    updateSettings({ enabled: true });
  };

  const handleShift = (deltaMinutes: number) => {
    const base = settings.timeOverride ?? (nextPlan
      ? { hour: nextPlan.fireAt.getHours(), minute: nextPlan.fireAt.getMinutes() as ReminderTime["minute"] }
      : DEFAULT_MANUAL_TIME);
    updateSettings({ timeOverride: shiftReminderTime(base, deltaMinutes) });
  };

  return (
    <View>
      <View className="flex-row items-center justify-between px-lg py-md" style={rowBorder}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text className="text-body-md" style={{ color: colors.onSurface }}>
            練習リマインド
          </Text>
          <Text className="text-label-sm" style={{ color: colors.onSurfaceVariant }}>
            前回のBPMと今日の目標をお知らせします。次回の予約はアプリを開いたときに更新されます
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={(value) => void handleToggle(value)}
          trackColor={{ true: colors.primary, false: colors.outlineVariant }}
          accessibilityLabel="練習リマインド"
        />
      </View>

      {isBlockedByOs && (
        <Pressable
          onPress={() => void Linking.openSettings()}
          className="flex-row items-center justify-between px-lg py-md active:opacity-70"
          style={rowBorder}
          accessibilityRole="button"
          accessibilityLabel="端末の設定を開く"
        >
          <Text className="text-body-md" style={{ color: colors.onSurfaceVariant, flex: 1 }}>
            端末の設定で通知が許可されていません
          </Text>
          <Text className="text-body-md" style={{ color: colors.primary }}>
            設定を開く
          </Text>
        </Pressable>
      )}

      <View className="flex-row items-center justify-between px-lg py-md" style={rowBorder}>
        <View style={{ flex: 1 }}>
          <Text className="text-body-md" style={{ color: colors.onSurface }}>
            時刻
          </Text>
          <Text className="text-label-sm" style={{ color: colors.onSurfaceVariant }}>
            {settings.timeOverride
              ? formatReminderTime(settings.timeOverride)
              : "自動（ふだんの練習時刻に合わせる）"}
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <StepButton
            label="−"
            accessibilityLabel="時刻を30分早くする"
            onPress={() => handleShift(-STEP_MINUTES)}
          />
          <StepButton
            label="＋"
            accessibilityLabel="時刻を30分遅くする"
            onPress={() => handleShift(STEP_MINUTES)}
          />
        </View>
      </View>

      {settings.timeOverride && (
        <Pressable
          onPress={() => updateSettings({ timeOverride: null })}
          className="px-lg py-md active:opacity-70"
          style={rowBorder}
          accessibilityRole="button"
          accessibilityLabel="時刻を自動に戻す"
        >
          <Text className="text-body-md" style={{ color: colors.primary }}>
            自動に戻す
          </Text>
        </Pressable>
      )}

      <View className="px-lg py-md">
        <Text className="text-label-sm" style={{ color: colors.onSurfaceVariant }}>
          {isActive && nextPlan
            ? `次回: ${formatFireAt(nextPlan.fireAt)}`
            : isActive
              ? "フレーズを保存すると予約されます"
              : "リマインドはオフです"}
        </Text>
      </View>
    </View>
  );
}
