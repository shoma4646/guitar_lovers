import { View, Text, Pressable } from "react-native";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors, radius } from "@/shared/theme";
import { semantic } from "@/shared/theme/semantic";
import { NUMERIC_MAX_FONT_SIZE_MULTIPLIER } from "@/shared/constants/layout";
import type { TodayMenuEntry } from "@/features/practice/lib/progression";
import {
  buildPhraseRowLabel,
  PHRASE_ROW_HINT,
  phraseRowAccessibilityActionProps,
  type PhraseOrganizeAction,
} from "@/features/practice/lib/phraseRowLabel";

const LEADING_ICON_SIZE = 20;

type Props = {
  entry: TodayMenuEntry;
  /** 前回までの到達BPM */
  currentBpm: number;
  /** 一覧の先頭行か。先頭以外は上に区切り線を引く */
  isFirst: boolean;
  /** いま練習中のフレーズか */
  active?: boolean;
  /** 名前の位置を揃えるため、アイコンが無い行でも左に枠を取るか */
  reserveLeadingSlot: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onOrganize: (action: PhraseOrganizeAction) => void;
};

/**
 * 今日のメニューの1行が左のアイコン枠を必要とするか（今日完了か練習中）
 * @param entry - 今日の練習メニューの1行
 * @param active - いま練習中のフレーズか
 */
export function needsLeadingIcon(entry: TodayMenuEntry, active = false): boolean {
  return entry.today.reached || active;
}

/**
 * 今日のフレーズ・全件シート・メニューシートで共通のフレーズ行
 *
 * 今日完了（`entry.today.reached`）なら緑のチェックと「今日完了」を、
 * 未完了なら「現在 → 今日の目標」を出す。卒業済みは名前の前に「卒業・」を付ける。
 */
export function PhraseMenuRow({
  entry,
  currentBpm,
  isFirst,
  active = false,
  reserveLeadingSlot,
  onPress,
  onLongPress,
  onOrganize,
}: Props) {
  const { today } = entry;
  const completed = today.reached;
  const graduated = entry.priority === "graduated";

  const leading = completed ? (
    <Icon name="check_circle" size={LEADING_ICON_SIZE} color={colors.primary} />
  ) : active ? (
    <View testID="phrase-menu-row-active-icon">
      <Icon name="play_circle" size={LEADING_ICON_SIZE} color={colors.primary} />
    </View>
  ) : reserveLeadingSlot ? (
    <View testID="phrase-menu-row-leading-placeholder" style={{ width: LEADING_ICON_SIZE }} />
  ) : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      className="active:opacity-80"
      style={{
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: colors.divider,
        backgroundColor: active ? colors.surfaceContainerLow : "transparent",
        borderRadius: active ? radius.sm : 0,
        paddingHorizontal: active ? 8 : 0,
      }}
      accessibilityRole="button"
      accessibilityLabel={buildPhraseRowLabel(entry, currentBpm)}
      accessibilityHint={PHRASE_ROW_HINT}
      {...phraseRowAccessibilityActionProps(onOrganize)}
    >
      {leading}
      <Text
        testID="phrase-menu-row-name"
        style={{
          flex: 1,
          fontSize: 15,
          fontWeight: "600",
          color: completed ? colors.onSurfaceVariant : colors.onSurface,
        }}
        numberOfLines={1}
      >
        {graduated && <Text style={{ color: semantic.graduated }}>卒業・</Text>}
        {entry.phrase.name}
      </Text>
      {completed ? (
        <Text
          testID="phrase-menu-row-bpm"
          maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER}
          style={{ fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"], color: colors.primary }}
        >
          {today.todayBestOkBpm}
          <Text style={{ fontSize: 12, fontWeight: "600" }}> 今日完了</Text>
        </Text>
      ) : (
        <Text
          testID="phrase-menu-row-bpm"
          maxFontSizeMultiplier={NUMERIC_MAX_FONT_SIZE_MULTIPLIER}
          style={{
            fontSize: 13,
            fontWeight: "700",
            fontVariant: ["tabular-nums"],
            color: colors.onSurfaceVariant,
          }}
        >
          {currentBpm}
          {" → "}
          <Text style={{ color: colors.primary }}>{today.targetBeforeToday}</Text>
        </Text>
      )}
    </Pressable>
  );
}
