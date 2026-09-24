/**
 * 統計カード（Stitch modern_2 風）
 *
 * 中央寄せの小さなラベル + 大きな primary 値。emphasized で主指標用に値を大きく表示する。
 */

import { View, Text, StyleSheet } from "react-native";
import { colors, shadows } from "@/shared/theme";

type Props = {
  label: string;
  value: string;
  /** 主指標として値を大きく表示する */
  emphasized?: boolean;
  /** 値の下に添える補足（任意） */
  caption?: string;
};

export function StatCard({ label, value, emphasized = false, caption }: Props) {
  return (
    <View
      className="bg-surface-container-lowest"
      style={[styles.card, shadowStyle]}
      accessibilityLabel={[`${label}: ${value}`, caption].filter(Boolean).join("、")}
    >
      <Text
        className="text-label-sm"
        style={{
          color: colors.outline,
          letterSpacing: 0.5,
          fontWeight: "600",
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: colors.primary,
          fontSize: emphasized ? 40 : 24,
          fontWeight: "700",
          lineHeight: emphasized ? 46 : 28,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value}
      </Text>
      {caption ? (
        <Text
          className="text-label-sm"
          style={{ color: colors.onSurfaceVariant, marginTop: 4 }}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

const shadowStyle = {
  ...shadows.layered,
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
});
