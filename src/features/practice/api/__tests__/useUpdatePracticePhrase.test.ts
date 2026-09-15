import mockAsyncStorage from "@react-native-async-storage/async-storage/jest/async-storage-mock";
import { resetGraduationOnTargetChange } from "../useUpdatePracticePhrase";

jest.mock("@react-native-async-storage/async-storage", () => mockAsyncStorage);

describe("resetGraduationOnTargetChange", () => {
  it("目標BPMを変える更新では卒業日時をクリアする", () => {
    const patch = resetGraduationOnTargetChange({ targetBpm: 140 });
    expect(patch).toEqual({ targetBpm: 140, graduatedAt: undefined });
    expect("graduatedAt" in patch).toBe(true);
  });

  it("目標BPMを含まない更新はそのまま返す", () => {
    const patch = { name: "新しい名前" };
    expect(resetGraduationOnTargetChange(patch)).toBe(patch);
  });

  it("呼び出し側がgraduatedAtを明示していれば上書きしない", () => {
    const patch = { targetBpm: 100, graduatedAt: "2026-09-10T00:00:00.000Z" };
    expect(resetGraduationOnTargetChange(patch)).toEqual(patch);
  });
});
