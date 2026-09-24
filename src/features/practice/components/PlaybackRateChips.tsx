/**
 * 再生速度選択チップ
 *
 * 動画のすぐ下に「速度」ラベルと1行で並べる。
 */

import { View, Text } from "react-native";
import { Chip } from "@/shared/components/atoms/Chip";
import { colors } from "@/shared/theme";
import { PLAYBACK_RATES, type PlaybackRate } from "@/stores/practice";

type Props = {
  value: PlaybackRate;
  onChange: (rate: PlaybackRate) => void;
};

export function PlaybackRateChips({ value, onChange }: Props) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onSurfaceVariant }}>速度</Text>
      <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
        {PLAYBACK_RATES.map((rate) => (
          <Chip
            key={rate}
            label={`${rate}x`}
            selected={value === rate}
            onPress={() => onChange(rate as PlaybackRate)}
            accessibilityLabel={`再生速度${rate}倍`}
            grow
          />
        ))}
      </View>
    </View>
  );
}
