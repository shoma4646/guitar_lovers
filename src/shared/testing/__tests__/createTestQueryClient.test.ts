import { createTestQueryClient } from "../createTestQueryClient";

describe("createTestQueryClient", () => {
  it("query・mutationともgcTimeが無限でgcタイマーを残さず、queryは再試行しない", () => {
    const client = createTestQueryClient();
    const defaults = client.getDefaultOptions();

    expect(defaults.queries?.gcTime).toBe(Infinity);
    expect(defaults.queries?.retry).toBe(false);
    expect(defaults.mutations?.gcTime).toBe(Infinity);
  });

  it("呼ぶたびに別のインスタンスを返し、テスト間でキャッシュを共有しない", () => {
    expect(createTestQueryClient()).not.toBe(createTestQueryClient());
  });
});
