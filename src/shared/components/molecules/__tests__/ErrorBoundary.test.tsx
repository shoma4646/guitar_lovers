import { Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { ErrorBoundary } from "../ErrorBoundary";

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error("boom");
  return <Text>safe</Text>;
}

describe("ErrorBoundary", () => {
  // ErrorBoundaryは捕捉時にconsole.errorを出すので抑制する
  let consoleSpy: jest.SpyInstance;
  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("子要素を素通ししてレンダリングする", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe")).toBeTruthy();
  });

  it("子要素がthrowしたらfallback UIを表示する", () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("問題が発生しました")).toBeTruthy();
    expect(screen.getByText("boom")).toBeTruthy();
  });

  it("子のthrow原因が解消された後にもう一度試すと子が描画される", () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    rerender(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    fireEvent.press(screen.getByText("もう一度試す"));
    expect(screen.getByText("safe")).toBeTruthy();
  });
});
