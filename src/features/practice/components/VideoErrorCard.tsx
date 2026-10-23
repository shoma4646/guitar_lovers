/**
 * 動画プレイヤーのエラー表示
 *
 * 通信エラーならその場で読み込み直せるようにし、練習中の回数は確認なしに消さない。
 */

import { useEffect } from "react";
import { AccessibilityInfo, Text, View } from "react-native";
import { Card } from "@/shared/components/molecules/Card";
import { Button } from "@/shared/components/atoms/Button";
import { Icon } from "@/shared/components/atoms/Icon";
import { colors } from "@/shared/theme";
import { usePracticeStore } from "@/stores/practice";
import { describePlayerError, describePlayerErrorTitle } from "@/features/practice/lib/playerError";
import { useCloseVideo } from "@/features/practice/hooks/useCloseVideo";

/** 読み込み失敗（通信エラー）を表すプレイヤーのエラーコード */
const LOAD_FAILED_CODE = -1;

type Props = {
  /** YouTube IFrame Player APIのエラーコード */
  code: number;
};

export function VideoErrorCard({ code }: Props) {
  const reloadVideo = usePracticeStore((s) => s.reloadVideo);
  const hasActivePhrase = usePracticeStore((s) => s.activePhrasePractice !== null);
  const closeVideo = useCloseVideo();

  const title = describePlayerErrorTitle(code);
  const message = describePlayerError(code);
  const canReload = code === LOAD_FAILED_CODE;

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
      <Button
        label={hasActivePhrase ? "今日のメニューに戻る" : "別の動画を読み込む"}
        onPress={closeVideo}
        variant={canReload ? "ghost" : "primary"}
      />
    </Card>
  );
}
