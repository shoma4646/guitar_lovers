import { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import { colors } from "@/shared/constants/colors";

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = {
  error: Error | null;
};

/** 予期しないエラーをキャッチしてfallback UIを表示する */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bgDark }}
        contentContainerStyle={{
          padding: 24,
          paddingTop: 80,
          alignItems: "center",
        }}
      >
        <Text style={{ color: colors.textWhite, fontSize: 20, fontWeight: "700" }}>
          問題が発生しました
        </Text>
        <Text
          style={{
            color: colors.textGray,
            fontSize: 13,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          アプリでエラーが起きたので、画面を再読み込みしてください
        </Text>

        <View
          style={{
            marginTop: 24,
            width: "100%",
            borderRadius: 16,
            padding: 16,
            backgroundColor: colors.bgLightDark,
          }}
        >
          <Text style={{ color: colors.textGray, fontSize: 12 }}>
            {error.message || String(error)}
          </Text>
        </View>

        <TouchableOpacity
          style={{
            marginTop: 32,
            alignItems: "center",
            borderRadius: 16,
            paddingHorizontal: 32,
            paddingVertical: 16,
            backgroundColor: colors.primary,
          }}
          onPress={this.reset}
          activeOpacity={0.8}
        >
          <Text style={{ color: colors.textWhite, fontSize: 16, fontWeight: "500" }}>
            もう一度試す
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
}
