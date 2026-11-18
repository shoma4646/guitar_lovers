import { render, screen } from "@testing-library/react-native";
import type { PracticeSession } from "@/shared/types/models";
import { RecentSessionsSheet } from "../RecentSessionsSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function renderSheet(sessions: PracticeSession[]) {
  render(
    <RecentSessionsSheet
      visible
      onClose={jest.fn()}
      sessions={sessions}
      onDelete={jest.fn()}
      onAddPress={jest.fn()}
    />,
  );
}

describe("RecentSessionsSheet", () => {
  it("記録が1件以上あるとき「長押しで削除」を表示する", () => {
    renderSheet([{ id: "s1", date: new Date(2026, 9, 20, 9).toISOString(), duration: 54000 }]);
    expect(screen.getByText("長押しで削除")).toBeTruthy();
  });

  it("記録が0件のとき「長押しで削除」を出さない", () => {
    renderSheet([]);
    expect(screen.getByText("練習記録がありません")).toBeTruthy();
    expect(screen.queryByText("長押しで削除")).toBeNull();
  });
});
