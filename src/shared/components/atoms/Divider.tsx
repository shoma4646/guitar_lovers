/**
 * 区切り線
 */

import { View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "@/shared/theme";

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function Divider({ style }: Props) {
  return <View accessible={false} style={[{ height: 1, backgroundColor: colors.divider }, style]} />;
}
