/**
 * 動画プレイヤーのエラー表示
 *
 * 通信エラーならその場で読み込み直せるようにし、練習中の回数は確認なしに消さない。
 * 動画が二度と再生できないエラーなら、練習中のフレーズの整理と次の1本への移動もここから行える。
 */

import { useEffect } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import { Card } from "@/shared/components/molecules/Card";
import { Button } from "@/shared/components/atoms/Button";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { usePracticeStore } from "@/stores/practice";
import {
  describePlayerError,
  describePlayerErrorTitle,
  isPermanentPlayerError,
} from "@/features/practice/lib/playerError";
import { useCloseVideo } from "@/features/practice/hooks/useCloseVideo";
import { usePhraseLongPressActions } from "@/features/practice/hooks/usePhraseLongPressActions";

/** 読み込み失敗（通信エラー）を表すプレイヤーのエラーコード */
const LOAD_FAILED_CODE = -1;

type Props = {
  /** YouTube IFrame Player APIのエラーコード */
  code: number;
  /** 今日のメニューに次の1本があるとき、その練習を始める。次が無ければ渡さない */
  onStartNextPhrase?: () => void;
};

export function VideoErrorCard({ code, onStartNextPhrase }: Props) {
  const reloadVideo = usePracticeStore((s) => s.reloadVideo);
  const activePhrase = usePracticeStore((s) => s.activePhrasePractice?.phrase ?? null);
  const hasActivePhrase = activePhrase !== null;
  const closeVideo = useCloseVideo();
  const organizePhrase = usePhraseLongPressActions();

  const title = describePlayerErrorTitle(code);
  const message = describePlayerError(code);
  const canReload = code === LOAD_FAILED_CODE;
  const unplayablePhrase = activePhrase !== null && isPermanentPlayerError(code) ? activePhrase : null;
  const canStartNext = unplayablePhrase !== null && onStartNextPhrase !== undefined;

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(`${title}。${message}`);
  }, [title, message]);

  return (
    <Card style={{ alignItems: "center", gap: 12 }}>
      <View accessible accessibilityRole="alert" style={{ alignItems: "center", gap: 12 }}>
        <Icon name="error" size={28} color={colors.error} />
        <Text style={{ fontSize: 15, fontWeight: "600", color: colors.onSurface, textAlign: "center" }}>
          {title}
        </Text>
        <Text style={{ fontSize: 12, color: colors.onSurfaceVariant, textAlign: "center" }}>
          {message}
        </Text>
      </View>
      {canReload ? (
        <Button label="もう一度読み込む" onPress={reloadVideo} variant="primary" icon="refresh" />
      ) : null}
      {canStartNext ? (
        <Button label="次の1本へ" onPress={onStartNextPhrase} variant="primary" icon="skip_next" />
      ) : null}
      {unplayablePhrase !== null ? (
        <Button
          label="このフレーズを整理"
          onPress={() => organizePhrase(unplayablePhrase)}
          variant="outline"
          accessibilityHint="アーカイブまたは削除を選べます"
        />
      ) : null}
      <Button
        label={hasActivePhrase ? "今日のメニューに戻る" : "別の動画を読み込む"}
        onPress={closeVideo}
        variant={canReload || canStartNext ? "ghost" : "primary"}
      />
    </Card>
  );
}
