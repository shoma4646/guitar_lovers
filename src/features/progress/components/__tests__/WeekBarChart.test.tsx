import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { colors } from "@/shared/theme";
import { contrastRatio } from "@/shared/theme/contrast";
import { semantic } from "@/shared/theme/semantic";
import { WeekBarChart } from "../WeekBarChart";

jest.mock("@expo/vector-icons/MaterialIcons", () => () => null);

function barStyle(idx: number) {
  return StyleSheet.flatten(screen.getByTestId(`week-bar-${idx}`).props.style);
}

describe("WeekBarChart: まだ来ていない曜日を休んだ日と区別する", () => {
  it("今日より後の曜日は、練習しなかった過去の曜日と背景と枠が違う", () => {
    // 金曜（index 4）に開き、月〜水は練習、木は休み、土日はこれから
    render(
      <WeekBarChart
        weeklyPracticedDays={[true, true, true, false, false, false, false]}
        todayIndex={4}
      />,
    );
    const missed = barStyle(3);
    const upcoming = barStyle(5);
    expect(upcoming.backgroundColor).not.toBe(missed.backgroundColor);
    expect(upcoming.borderColor).not.toBe(missed.borderColor);
    expect(upcoming.borderWidth ?? 0).toBeGreaterThan(0);
    expect(barStyle(6)).toEqual(upcoming);
  });

  it("これからの曜日の枠線はカードの白に対して非テキストの 3:1 以上", () => {
    expect(contrastRatio(semantic.weekUpcoming, colors.surfaceContainerLowest)).toBeGreaterThanOrEqual(3);
  });

  it("今日はまだ練習していなくても、これからの曜日の見た目にならない", () => {
    render(
      <WeekBarChart
        weeklyPracticedDays={[false, false, false, false, false, false, false]}
        todayIndex={0}
      />,
    );
    expect(barStyle(0).backgroundColor).not.toBe(barStyle(1).backgroundColor);
  });

  it("今日のラベルに「今日」が入り、今日より後の曜日は「練習なし」と読まれない", () => {
    render(
      <WeekBarChart
        weeklyPracticedDays={[true, true, false, false, false, false, false]}
        todayIndex={2}
      />,
    );
    expect(
      screen.getByLabelText(
        "今週の練習 7日中2日。月曜 練習した、火曜 練習した、水曜（今日） まだ、木曜以降 これから",
      ),
    ).toBeTruthy();
  });

  it("月曜の朝は今日だけが「まだ」で、火曜以降は「これから」と読まれる", () => {
    render(
      <WeekBarChart
        weeklyPracticedDays={[false, false, false, false, false, false, false]}
        todayIndex={0}
      />,
    );
    const label: string = screen.getByRole("image").props.accessibilityLabel;
    expect(label).toBe("今週の練習 7日中0日。月曜（今日） まだ、火曜以降 これから");
    expect(label).not.toContain("練習なし");
  });

  it("今日に練習済みなら「練習した」、これからが1日だけなら範囲にしない", () => {
    render(
      <WeekBarChart
        weeklyPracticedDays={[false, true, false, false, false, true, false]}
        todayIndex={5}
      />,
    );
    expect(screen.getByRole("image").props.accessibilityLabel).toBe(
      "今週の練習 7日中2日。月曜 練習なし、火曜 練習した、水曜 練習なし、木曜 練習なし、金曜 練習なし、土曜（今日） 練習した、日曜 これから",
    );
  });

  it("今日より後の日に記録があるときは、まとめずにその日を「練習した」と読む", () => {
    render(
      <WeekBarChart
        weeklyPracticedDays={[true, false, false, false, false, true, false]}
        todayIndex={3}
      />,
    );
    expect(screen.getByRole("image").props.accessibilityLabel).toBe(
      "今週の練習 7日中2日。月曜 練習した、火曜 練習なし、水曜 練習なし、木曜（今日） まだ、金曜 これから、土曜 練習した、日曜 これから",
    );
  });

  it("日曜に開いたときは「これから」が無い", () => {
    render(
      <WeekBarChart
        weeklyPracticedDays={[true, false, false, false, false, false, false]}
        todayIndex={6}
      />,
    );
    const label: string = screen.getByRole("image").props.accessibilityLabel;
    expect(label).toContain("日曜（今日） まだ");
    expect(label).not.toContain("これから");
  });
});
