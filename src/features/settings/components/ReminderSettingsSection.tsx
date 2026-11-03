/**
 * 設定画面のリマインド通知セクション
 *
 * 通知のON/OFF、送信時刻（自動 or 30分刻みの手動指定）、次回の予定を表示する。
 * OSで通知が拒否されている場合は端末の設定への導線を出す
 */

import { View, Text, Pressable, Switch, Linking, type AccessibilityActionEvent } from "react-native";
import { colors } from "@/shared/theme";
import { Icon } from "@/shared/components/atoms/Icon";
import { useHoldRepeat } from "@/shared/hooks/useHoldRepeat";
import { useReminderSettings } from "@/features/reminder/api/useReminderSettings";
import { useReminderPermission } from "@/features/reminder/api/useReminderPermission";
import { useNextReminderPlan } from "@/features/reminder/api/useNextReminderPlan";
import { useUpdateReminderSettings } from "@/features/reminder/api/useUpdateReminderSettings";
import { ensureReminderPermission } from "@/features/reminder/services/reminderScheduler";
import {
  formatReminderTime,
  formatReminderTimeForSpeech,
  shiftReminderTime,
} from "@/features/reminder/lib/reminderTime";
import type { ReminderTime } from "@/shared/lib/schemas/reminderSettings";

const STEP_MINUTES = 30;
const DEFAULT_MANUAL_TIME: ReminderTime = { hour: 20, minute: 0 };
const AUTO_TIME_LABEL = "自動（ふだんの練習時刻に合わせる）";

const rowBorder = { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant };

function formatFireAt(date: Date): string {
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${date.getMonth() + 1}/${date.getDate()} ${time}`;
}

type StepButtonProps = {
  icon: "add" | "remove";
  accessibilityLabel: string;
  disabled: boolean;
  onStep: () => void;
};

function StepButton({ icon, accessibilityLabel, disabled, onStep }: StepButtonProps) {
  const hold = useHoldRepeat(onStep, disabled);
  return (
    <Pressable
      onPress={hold.onPress}
      onPressIn={hold.onPressIn}
      onPressOut={hold.onPressOut}
      disabled={disabled}
      className="items-center justify-center active:opacity-70"
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surfaceContainerLow,
        opacity: disabled ? 0.4 : 1,
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="長押しで連続変更"
      accessibilityState={{ disabled }}
    >
      <Icon name={icon} size={20} color={colors.onSurface} />
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

  // トグルは設定値のみを表す。OS許可の有無は別行（isBlockedByOs）で案内する
  const isActive = settings.enabled;
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

  const baseTime = settings.timeOverride ?? (nextPlan?.fireAt
    ? { hour: nextPlan.fireAt.getHours(), minute: nextPlan.fireAt.getMinutes() as ReminderTime["minute"] }
    : DEFAULT_MANUAL_TIME);
  const canShift = (deltaMinutes: number) => {
    const shifted = shiftReminderTime(baseTime, deltaMinutes);
    return shifted.hour !== baseTime.hour || shifted.minute !== baseTime.minute;
  };
  const canShiftEarlier = canShift(-STEP_MINUTES);
  const canShiftLater = canShift(STEP_MINUTES);

  const handleShift = (deltaMinutes: number) => {
    if (!canShift(deltaMinutes)) return;
    updateSettings({ timeOverride: shiftReminderTime(baseTime, deltaMinutes) });
  };

  const handleTimeAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "increment") handleShift(STEP_MINUTES);
    if (event.nativeEvent.actionName === "decrement") handleShift(-STEP_MINUTES);
  };

  return (
    <View>
      <View className="flex-row items-center justify-between px-lg py-md" style={rowBorder}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text className="text-body-md" style={{ color: colors.onSurface }}>
            練習リマインド
          </Text>
          <Text className="text-caption" style={{ color: colors.onSurfaceVariant }}>
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
        <View
          style={{ flex: 1, paddingRight: 12 }}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="リマインドの時刻"
          accessibilityValue={{
            text: settings.timeOverride ? formatReminderTimeForSpeech(settings.timeOverride) : AUTO_TIME_LABEL,
          }}
          accessibilityActions={[
            { name: "increment", label: "30分遅くする" },
            { name: "decrement", label: "30分早くする" },
          ]}
          onAccessibilityAction={handleTimeAction}
        >
          <Text className="text-body-md" style={{ color: colors.onSurface }}>
            時刻
          </Text>
          <Text className="text-caption" style={{ color: colors.onSurfaceVariant }}>
            {settings.timeOverride ? formatReminderTime(settings.timeOverride) : AUTO_TIME_LABEL}
          </Text>
        </View>
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <StepButton
            icon="remove"
            accessibilityLabel="時刻を30分早くする"
            disabled={!canShiftEarlier}
            onStep={() => handleShift(-STEP_MINUTES)}
          />
          <StepButton
            icon="add"
            accessibilityLabel="時刻を30分遅くする"
            disabled={!canShiftLater}
            onStep={() => handleShift(STEP_MINUTES)}
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
        <Text className="text-caption" style={{ color: colors.onSurfaceVariant }}>
          {isActive && nextPlan?.fireAt
            ? `次回: ${formatFireAt(nextPlan.fireAt)}`
            : isActive && nextPlan?.syncFailed
              ? "予約に失敗しました。もう一度お試しください"
              : isActive
                ? "フレーズを保存すると予約されます"
                : "リマインドはオフです"}
        </Text>
      </View>
    </View>
  );
}
