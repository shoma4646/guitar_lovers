import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { Alert } from "react-native";
import { savePhraseAttempt } from "@/shared/services/storage";
import { showMutationError } from "../showMutationError";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

describe("showMutationError", () => {
  beforeEach(() => {
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("書き込み時の検証で弾かれたときは入力値の問題として表示する", async () => {
    const error = await savePhraseAttempt({
      id: "a1",
      phraseId: "p",
      date: "2026-09-02T00:00:00.000Z",
      bpm: 39.5,
      result: "ok",
    }).catch((e: unknown) => e);

    showMutationError(error);

    expect(Alert.alert).toHaveBeenCalledWith(
      "保存できませんでした",
      "入力内容に保存できない値が含まれています",
    );
  });

  it("それ以外の失敗はストレージの状態を確認するよう表示する", () => {
    showMutationError(new Error("disk full"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "保存に失敗しました",
      "端末の空き容量やストレージの状態を確認してください",
    );
  });
});
