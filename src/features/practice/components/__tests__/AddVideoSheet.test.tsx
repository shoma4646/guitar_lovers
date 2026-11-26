import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, Alert, type AlertButton } from "react-native";
import { usePracticeStore } from "@/stores/practice";
import { describePlayerError } from "@/features/practice/lib/playerError";
import { isInsideVerticalScroll } from "@/shared/testing/sheetScroll";
import { AddVideoSheet } from "../AddVideoSheet";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/features/practice/api/useRecentVideos", () => ({
  useRecentVideos: () => ({ data: [] }),
}));
jest.mock("@/features/practice/api/usePracticePhrases", () => ({
  usePracticePhrases: () => ({ data: [] }),
}));

let mockPasteButtonAvailable = false;
let mockClipboardText = "";
let mockPastePayload: { type: "text"; text: string } | { type: "image"; data: string } = {
  type: "text",
  text: "",
};
jest.mock("expo-clipboard", () => {
  const { Pressable } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    get isPasteButtonAvailable() {
      return mockPasteButtonAvailable;
    },
    getStringAsync: () => Promise.resolve(mockClipboardText),
    ClipboardPasteButton: ({ onPress }: { onPress: (data: typeof mockPastePayload) => void }) => (
      <Pressable testID="clipboard-paste-button" onPress={() => onPress(mockPastePayload)} />
    ),
  };
});

const initialState = usePracticeStore.getState();

describe("AddVideoSheet の動画エラー表示", () => {
  beforeEach(() => {
    usePracticeStore.setState(initialState, true);
  });

  it.each([
    [-1, "動画を読み込めませんでした"],
    [100, "この動画は再生できません"],
    [150, "この動画はアプリ内で再生できません"],
  ])("playerError=%i で開くと、コード別の見出しとdescribePlayerErrorの文言を出す", (code, title) => {
    usePracticeStore.getState().setPlayerError(code);

    render(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(describePlayerError(code))).toBeTruthy();
  });

  it("エラーが無ければ案内を出さない", () => {
    render(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("AddVideoSheet のクリップボードからの読み込み", () => {
  const onClose = jest.fn();

  beforeEach(() => {
    usePracticeStore.setState(initialState, true);
    onClose.mockClear();
    mockPasteButtonAvailable = false;
    mockClipboardText = "";
    mockPastePayload = { type: "text", text: "" };
  });

  it("入力欄に自動でカーソルが入る", () => {
    render(<AddVideoSheet visible onClose={onClose} />);

    expect(screen.getByLabelText("YouTube URL入力").props.autoFocus).toBe(true);
  });

  describe("OS標準の貼り付けボタンが使えない端末", () => {
    it("YouTubeのURLがコピーされていれば、ボタン1回で動画を読み込みシートを閉じる", async () => {
      mockClipboardText = "https://youtu.be/dQw4w9WgXcQ";
      render(<AddVideoSheet visible onClose={onClose} />);

      expect(screen.queryByTestId("clipboard-paste-button")).toBeNull();
      fireEvent.press(screen.getByRole("button", { name: "コピーしたURLを貼り付けて読み込む" }));

      await waitFor(() => expect(usePracticeStore.getState().loadedVideoId).toBe("dQw4w9WgXcQ"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["YouTube以外の文字列", "https://example.com/watch?v=dQw4w9WgXcQ"],
      ["空", ""],
      ["空白だけ", "   "],
    ])("クリップボードが%sならURLエラーを出し、何も読み込まない", async (_label, text) => {
      mockClipboardText = text;
      render(<AddVideoSheet visible onClose={onClose} />);

      fireEvent.press(screen.getByRole("button", { name: "コピーしたURLを貼り付けて読み込む" }));

      expect(await screen.findByText("YouTubeの動画URLではないようです")).toBeTruthy();
      expect(usePracticeStore.getState().loadedVideoId).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("貼り付けた文字列を入力欄に入れ、手入力と同じく前後の空白を除いて判定する", async () => {
      mockClipboardText = "  https://www.youtube.com/watch?v=dQw4w9WgXcQ\n";
      render(<AddVideoSheet visible onClose={onClose} />);

      fireEvent.press(screen.getByRole("button", { name: "コピーしたURLを貼り付けて読み込む" }));

      await waitFor(() => expect(usePracticeStore.getState().loadedVideoId).toBe("dQw4w9WgXcQ"));
      expect(screen.getByLabelText("YouTube URL入力").props.value).toBe(mockClipboardText);
    });
  });

  describe("OS標準の貼り付けボタンが使える端末（iOS 16以上）", () => {
    beforeEach(() => {
      mockPasteButtonAvailable = true;
    });

    it("代わりのボタンを出さず、OS標準の貼り付けボタンから動画を読み込む", () => {
      mockPastePayload = { type: "text", text: "https://youtu.be/dQw4w9WgXcQ" };
      render(<AddVideoSheet visible onClose={onClose} />);

      expect(screen.queryByRole("button", { name: "コピーしたURLを貼り付けて読み込む" })).toBeNull();
      fireEvent.press(screen.getByTestId("clipboard-paste-button"));

      expect(usePracticeStore.getState().loadedVideoId).toBe("dQw4w9WgXcQ");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["YouTube以外の文字列", { type: "text" as const, text: "ギターの練習" }],
      ["画像", { type: "image" as const, data: "data:image/png;base64,AAAA" }],
    ])("貼り付けた内容が%sならURLエラーを出し、何も読み込まない", (_label, payload) => {
      mockPastePayload = payload;
      render(<AddVideoSheet visible onClose={onClose} />);

      fireEvent.press(screen.getByTestId("clipboard-paste-button"));

      expect(screen.getByText("YouTubeの動画URLではないようです")).toBeTruthy();
      expect(usePracticeStore.getState().loadedVideoId).toBeNull();
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});

describe("AddVideoSheet のエラーの読み上げ", () => {
  const URL_ERROR_SPEECH =
    "YouTubeの動画URLではないようです。youtube.com または youtu.be から始まるURLを貼り付けてください。";
  let announceSpy: jest.SpyInstance;

  beforeEach(() => {
    usePracticeStore.setState(initialState, true);
    mockPasteButtonAvailable = false;
    announceSpy = jest.spyOn(AccessibilityInfo, "announceForAccessibility").mockImplementation(() => {});
    announceSpy.mockClear();
  });

  afterEach(() => {
    announceSpy.mockRestore();
  });

  it("YouTube以外のURLを読み込もうとすると、URLエラーの案内を1回読み上げる", () => {
    render(<AddVideoSheet visible onClose={jest.fn()} />);

    fireEvent.changeText(screen.getByLabelText("YouTube URL入力"), "https://example.com/");
    fireEvent.press(screen.getByRole("button", { name: "読み込む" }));

    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith(URL_ERROR_SPEECH);
  });

  it("URLエラーが出たまま再描画しても、重ねて読み上げない", () => {
    const { rerender } = render(<AddVideoSheet visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("YouTube URL入力"), "https://example.com/");
    fireEvent.press(screen.getByRole("button", { name: "読み込む" }));

    rerender(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(announceSpy).toHaveBeenCalledTimes(1);
  });

  it("開いた時点でプレイヤーのエラーがあれば、その案内を1回読み上げる", () => {
    usePracticeStore.getState().setPlayerError(150);

    render(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(announceSpy).toHaveBeenCalledTimes(1);
    expect(announceSpy).toHaveBeenCalledWith(
      `この動画はアプリ内で再生できません。${describePlayerError(150)}`,
    );
  });

  it("閉じている間は読み上げず、同じプレイヤーのエラーのまま開き直すと改めて1回読み上げる", () => {
    usePracticeStore.getState().setPlayerError(150);
    const { rerender } = render(<AddVideoSheet visible onClose={jest.fn()} />);

    rerender(<AddVideoSheet visible={false} onClose={jest.fn()} />);
    expect(announceSpy).toHaveBeenCalledTimes(1);

    rerender(<AddVideoSheet visible onClose={jest.fn()} />);
    expect(announceSpy).toHaveBeenCalledTimes(2);
  });

  it("エラーが無ければ読み上げない", () => {
    render(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(announceSpy).not.toHaveBeenCalled();
  });

  it("URLエラーのまま閉じて開き直したとき、前回のエラーを読み上げも表示もしない", () => {
    const { rerender } = render(<AddVideoSheet visible onClose={jest.fn()} />);
    fireEvent.changeText(screen.getByLabelText("YouTube URL入力"), "https://example.com/");
    fireEvent.press(screen.getByRole("button", { name: "読み込む" }));
    rerender(<AddVideoSheet visible={false} onClose={jest.fn()} />);
    announceSpy.mockClear();

    rerender(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(announceSpy).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("AddVideoSheet: 保存していない区間・ブックマークがある動画から別の動画を開く", () => {
  beforeEach(() => {
    usePracticeStore.setState(initialState, true);
    const store = usePracticeStore.getState();
    store.loadVideo("abc123def45", "練習中の動画");
    store.setABLoop({ pointA: 83, pointB: 101, enabled: true });
    store.addBookmark({ id: "b1", time: 90, createdAt: "2026-09-01T00:00:00.000Z" });
  });

  it("貼り付けたURLを読み込む前に確認を出し、キャンセルすると前の動画の区間とブックマークが残る", () => {
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    const onClose = jest.fn();
    render(<AddVideoSheet visible onClose={onClose} />);

    fireEvent.changeText(screen.getByLabelText("YouTube URL入力"), "https://youtu.be/dQw4w9WgXcQ");
    fireEvent.press(screen.getByRole("button", { name: "読み込む" }));

    expect(alertSpy).toHaveBeenCalledWith(
      "保存していない内容が消えます",
      "区間 01:23〜01:41とブックマーク1件はまだ保存されていません。切り替えると失われます。",
      expect.any(Array),
    );
    (alertSpy.mock.calls[0][2] as AlertButton[]).find((b) => b.text === "キャンセル")?.onPress?.();
    const state = usePracticeStore.getState();
    expect(state.loadedVideoId).toBe("abc123def45");
    expect(state.abLoop).toEqual({ pointA: 83, pointB: 101, enabled: true });
    expect(state.bookmarks).toHaveLength(1);
    expect(onClose).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe("AddVideoSheet の文字を大きくしたとき", () => {
  beforeEach(() => {
    usePracticeStore.setState(initialState, true);
  });

  it("URL入力と「読み込む」はシートの縦スクロールの中に描き、画面からはみ出しても届く", () => {
    render(<AddVideoSheet visible onClose={jest.fn()} />);

    expect(isInsideVerticalScroll(screen.getByLabelText("YouTube URL入力"))).toBe(true);
    expect(isInsideVerticalScroll(screen.getByText("読み込む"))).toBe(true);
  });
});
