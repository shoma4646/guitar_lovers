import { shouldKeepAwakeWhileTuning } from "../keepAwake";

describe("shouldKeepAwakeWhileTuning", () => {
  it("マイク入力中だけ抑止する", () => {
    expect(shouldKeepAwakeWhileTuning("listening")).toBe(true);
  });

  it.each(["idle", "requesting", "denied", "error"] as const)("%s では抑止しない", (status) => {
    expect(shouldKeepAwakeWhileTuning(status)).toBe(false);
  });
});
