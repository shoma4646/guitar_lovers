import { Alert } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";
import type { PracticeSession } from "@/shared/types/models";
import { SessionRow } from "../SessionRow";

const NOW = new Date(2026, 9, 22, 8, 0, 0, 0);

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: "s1",
    date: new Date(2026, 9, 21, 23, 0, 0, 0).toISOString(),
    duration: 900,
    ...overrides,
  };
}

describe("SessionRow", () => {
  beforeEach(() => {
    jest.useFakeTimers({
      now: NOW,
      doNotFake: [
        "nextTick",
        "setImmediate",
        "clearImmediate",
        "setTimeout",
        "clearTimeout",
        "setInterval",
        "clearInterval",
        "queueMicrotask",
        "requestAnimationFrame",
        "cancelAnimationFrame",
      ],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("前日深夜の記録は「昨日」と表示し、英語の文言を出さない", () => {
    render(<SessionRow session={makeSession()} onDelete={jest.fn()} />);
    expect(screen.getByText("昨日")).toBeTruthy();
    expect(screen.getByText("練習")).toBeTruthy();
    expect(screen.queryByText(/Today|Yesterday|Practice Session/)).toBeNull();
  });

  it("行は日付・練習時間・メモをまとめたラベルを持つ1要素として取得できる", () => {
    render(<SessionRow session={makeSession({ notes: "Aメロ" })} onDelete={jest.fn()} />);
    const row = screen.getByLabelText("10月21日（昨日）、練習15分、メモ Aメロ");
    expect(row.props.accessible).toBe(true);
    expect(row.props.accessibilityActions).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "delete" })]),
    );
  });

  it("2暦日以上前の記録はラベルに相対日付を重ねない", () => {
    const session = makeSession({ date: new Date(2026, 9, 20, 9).toISOString(), duration: 45 });
    render(<SessionRow session={session} onDelete={jest.fn()} />);
    expect(screen.getByLabelText("10月20日、練習45秒")).toBeTruthy();
  });

  it("削除アクションで長押しと同じ削除確認を出し、確定で onDelete が呼ばれる", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const onDelete = jest.fn();
    render(<SessionRow session={makeSession()} onDelete={onDelete} />);
    const row = screen.getByLabelText(/10月21日/);

    fireEvent(row, "accessibilityAction", { nativeEvent: { actionName: "delete" } });

    expect(alertSpy).toHaveBeenCalledWith("削除確認", "この練習記録を削除しますか？", expect.any(Array));
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((b) => b.text === "削除")?.onPress?.();
    expect(onDelete).toHaveBeenCalledWith("s1");
  });

  it("長押しでも同じ削除確認を出す", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    render(<SessionRow session={makeSession()} onDelete={jest.fn()} />);
    fireEvent(screen.getByLabelText(/10月21日/), "longPress");
    expect(alertSpy).toHaveBeenCalledWith("削除確認", "この練習記録を削除しますか？", expect.any(Array));
  });
});
