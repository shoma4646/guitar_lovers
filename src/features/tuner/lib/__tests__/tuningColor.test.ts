import { semantic } from "@/shared/theme/semantic";
import { tuningColor } from "../meter";

describe("tuningColor", () => {
  it("未検出・ずれ・合っているの3状態で色がすべて異なる", () => {
    const idle = tuningColor("in", false);
    const off = tuningColor("flat", true);
    const inTune = tuningColor("in", true);
    expect(new Set([idle, off, inTune]).size).toBe(3);
  });

  it("状態ごとに意味トークンを返す", () => {
    expect(tuningColor("in", true)).toBe(semantic.tunerInTune);
    expect(tuningColor("flat", true)).toBe(semantic.tunerOff);
    expect(tuningColor("sharp", true)).toBe(semantic.tunerOff);
    expect(tuningColor("flat", false)).toBe(semantic.tunerIdle);
    expect(tuningColor("sharp", false)).toBe(semantic.tunerIdle);
  });
});
