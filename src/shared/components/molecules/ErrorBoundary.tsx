import { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity, ScrollView, Linking } from "react-native";
import { colors } from "@/shared/theme/colors";
import { SUPPORT_URL } from "@/shared/constants/links";
import { Button } from "@/shared/components/atoms/Button";

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = {
  error: Error | null;
  showDetails: boolean;
};

/** 予期しないエラーをキャッチしてfallback UIを表示する */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, showDetails: false };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  reset = () => this.setState({ error: null, showDetails: false });

  toggleDetails = () => this.setState((prev) => ({ showDetails: !prev.showDetails }));

  openSupport = () => {
    Linking.openURL(SUPPORT_URL).catch(() => {});
  };

  render() {
    const { error, showDetails } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.surface }}
        contentContainerStyle={{
          padding: 24,
          paddingTop: 80,
          alignItems: "center",
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: colors.onSurface, fontSize: 20, fontWeight: "700" }}
        >
          問題が発生しました
        </Text>
        <Text
          style={{
            color: colors.onSurfaceVariant,
            fontSize: 13,
            marginTop: 12,
            textAlign: "center",
          }}
        >
          表示中にエラーが起きました。保存した記録は消えていません。『もう一度試す』で直らないときは、アプリを終了して開き直してください。
        </Text>

        <TouchableOpacity
          accessibilityRole="button"
          style={{
            marginTop: 32,
            alignItems: "center",
            borderRadius: 999,
            paddingHorizontal: 32,
            paddingVertical: 16,
            backgroundColor: colors.primary,
          }}
          onPress={this.reset}
          activeOpacity={0.8}
        >
          <Text style={{ color: colors.onPrimary, fontSize: 16, fontWeight: "600" }}>
            もう一度試す
          </Text>
        </TouchableOpacity>

        <Button
          label="サポートに問い合わせる"
          variant="outline"
          onPress={this.openSupport}
          style={{ marginTop: 12 }}
        />

        <Button
          label="エラーの詳細"
          variant="ghost"
          size="sm"
          onPress={this.toggleDetails}
          style={{ marginTop: 16 }}
        />

        {showDetails && (
          <View
            style={{
              marginTop: 8,
              width: "100%",
              borderRadius: 16,
              padding: 16,
              backgroundColor: colors.surfaceContainerLowest,
            }}
          >
            <Text selectable style={{ color: colors.onSurfaceVariant, fontSize: 12 }}>
              {error.message || String(error)}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }
}
