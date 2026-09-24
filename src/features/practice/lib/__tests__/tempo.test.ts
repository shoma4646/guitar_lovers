import { stepBpm } from "../tempo";
import { BPM_MAX, BPM_MIN } from "@/shared/constants/bpm";

describe("stepBpm", () => {
  it("deltaぶんBPMを増減する", () => {
    expect(stepBpm(120, 1)).toBe(121);
    expect(stepBpm(120, -1)).toBe(119);
  });

  it("上限を超えないようクランプする", () => {
    expect(stepBpm(BPM_MAX, 1)).toBe(BPM_MAX);
  });

  it("下限を下回らないようクランプする", () => {
    expect(stepBpm(BPM_MIN, -1)).toBe(BPM_MIN);
  });
});
