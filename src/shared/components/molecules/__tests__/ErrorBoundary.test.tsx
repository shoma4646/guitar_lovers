import { Linking, Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { SUPPORT_URL } from "@/shared/constants/links";
import { ErrorBoundary } from "../ErrorBoundary";

const mockWindow = { width: 393, height: 852, scale: 3, fontScale: 1 };
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow,
}));

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

  function renderCrashed() {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
  }

  it("子要素がthrowしたら見出しを表示し、エラー文は初めは隠す", () => {
    renderCrashed();
    expect(screen.getByRole("header", { name: "問題が発生しました" })).toBeTruthy();
    expect(screen.queryByText("boom")).toBeNull();
  });

  it("「エラーの詳細」を押すとエラー文を選択できる形で表示する", () => {
    renderCrashed();
    fireEvent.press(screen.getByRole("button", { name: "エラーの詳細" }));
    expect(screen.getByText("boom").props.selectable).toBe(true);
  });

  it("本文で記録が消えていないことと、アプリを開き直す手順を案内する", () => {
    renderCrashed();
    const body = screen.getByText(/保存した記録は消えていません/);
    expect(body.props.children).toEqual(expect.stringContaining("アプリを終了して開き直して"));
    expect(screen.queryByText(/再読み込み/)).toBeNull();
  });

  it("「サポートに問い合わせる」で設定画面と同じサポートページを開く", () => {
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    renderCrashed();
    fireEvent.press(screen.getByRole("button", { name: "サポートに問い合わせる" }));
    expect(openURL).toHaveBeenCalledWith(SUPPORT_URL);
    openURL.mockRestore();
  });

  it("文字サイズ2倍・幅320でもボタン2つと詳細を描画できる", () => {
    mockWindow.width = 320;
    mockWindow.fontScale = 2;
    try {
      renderCrashed();
      fireEvent.press(screen.getByRole("button", { name: "エラーの詳細" }));
      expect(screen.getByRole("button", { name: "もう一度試す" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "サポートに問い合わせる" })).toBeTruthy();
      expect(screen.getByText("boom")).toBeTruthy();
    } finally {
      mockWindow.width = 393;
      mockWindow.fontScale = 1;
    }
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
