import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/shared/constants/colors";

type Props = {
  label: string;
  value: string;
  icon: string;
  accentColor?: string;
};

/** 統計カードコンポーネント */
export function StatCard({
  label,
  value,
  icon,
  accentColor = colors.primary,
}: Props) {
  return (
    <View
      style={styles.card}
      accessibilityLabel={`${label}: ${value}`}
    >
      <View
        style={[styles.iconWrap, { backgroundColor: accentColor + "22" }]}
      >
        <Ionicons name={icon as never} size={20} color={accentColor} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "47.5%",
    borderRadius: 14,
    padding: 14,
    gap: 6,
    backgroundColor: colors.bgLightDark,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    color: colors.textWhite,
    fontSize: 20,
    fontWeight: "700",
  },
  label: {
    color: colors.textGray,
    fontSize: 12,
  },
});
