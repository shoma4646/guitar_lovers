import { render, screen } from "@testing-library/react-native";
import { countNestedVerticalScrolls, isInsideVerticalScroll } from "@/shared/testing/sheetScroll";
import { AllPhrasesProgressSheet } from "../AllPhrasesProgressSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

describe("AllPhrasesProgressSheet のスクロール", () => {
  it("切り替えはスクロールの外に置き、一覧は自前のスクロール1つだけで描く", () => {
    render(
      <AllPhrasesProgressSheet visible onClose={jest.fn()} inProgress={[]} graduated={[]} initialKind="active" />,
    );

    expect(isInsideVerticalScroll(screen.getByRole("tab", { name: /上達中/ }))).toBe(false);
    expect(countNestedVerticalScrolls()).toBe(0);
  });
});
