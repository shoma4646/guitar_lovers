import { render } from "@testing-library/react-native";
import TabLayout from "@/app/(tabs)/_layout";

const mockScreenOptions: Record<string, { title?: string }> = {};

jest.mock("expo-router", () => {
  function Tabs({ children }: { children: React.ReactNode }) {
    return children;
  }
  function Screen({ name, options }: { name: string; options: { title?: string } }) {
    mockScreenOptions[name] = options;
    return null;
  }
  Tabs.Screen = Screen;
  return { Tabs };
});
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

describe("下部タブのラベル", () => {
  it("3タブのラベルが日本語の「練習」「進捗」「チューナー」である", () => {
    render(<TabLayout />);

    expect(mockScreenOptions.practice?.title).toBe("練習");
    expect(mockScreenOptions.progress?.title).toBe("進捗");
    expect(mockScreenOptions.tuner?.title).toBe("チューナー");
  });
});
