/**
 * 端末内の記録を読み出せなかったときのカード
 *
 * 読み出し失敗を0件の空状態として描くと記録が消えたように見えるため、空状態の代わりにこれを出す。
 */

import { View, Text } from "react-native";
import { Card } from "@/shared/components/molecules/Card";
import { Button } from "@/shared/components/atoms/Button";
import { colors } from "@/shared/theme";

type Props = {
  /** 何を読み込めなかったか（例:「お気に入りを読み込めませんでした」） */
  title?: string;
  onRetry: () => void;
};

export function ReadErrorCard({ title = "練習の記録を読み込めませんでした", onRetry }: Props) {
  return (
    <Card style={{ gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Text style={{ fontSize: 15, fontWeight: "700", color: colors.onSurface }}>{title}</Text>
        <Text style={{ fontSize: 13, lineHeight: 18, color: colors.onSurfaceVariant }}>
          端末内の記録の読み出しに失敗しました。少し待ってから再読み込みしてください
        </Text>
      </View>
      <Button label="再読み込み" onPress={onRetry} variant="primary" size="lg" icon="refresh" fullWidth />
    </Card>
  );
}
